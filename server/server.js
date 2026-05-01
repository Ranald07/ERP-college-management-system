require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const app     = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── One-time setup route ───────────────────────────────────
app.get("/api/setup", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).send("Forbidden");
  try {
    const mysql2 = require("mysql2/promise");
    const conn = await mysql2.createConnection({
      host: process.env.DB_HOST, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306, multipleStatements: true,
    });

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, role ENUM('admin','student','teacher') NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS departments (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, code VARCHAR(10) NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS students (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, reg_no VARCHAR(20) NOT NULL UNIQUE, dept_id INT NOT NULL, year TINYINT NOT NULL, gender ENUM('Male','Female','Other') NOT NULL, dob DATE NOT NULL, accommodation_type ENUM('Hosteller','Day Scholar') NOT NULL DEFAULT 'Day Scholar', room_no VARCHAR(20), phone VARCHAR(15), photo_url VARCHAR(255), staff_advisor_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (dept_id) REFERENCES departments(id))`,
      `CREATE TABLE IF NOT EXISTS teachers (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, employee_id VARCHAR(20) NOT NULL UNIQUE, dept_id INT NOT NULL, designation VARCHAR(100) DEFAULT 'Assistant Professor', phone VARCHAR(15), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (dept_id) REFERENCES departments(id))`,
      `ALTER TABLE students ADD CONSTRAINT fk_student_advisor FOREIGN KEY (staff_advisor_id) REFERENCES teachers(id) ON DELETE SET NULL`,
      `CREATE TABLE IF NOT EXISTS subjects (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, dept_id INT NOT NULL, year TINYINT NOT NULL, semester TINYINT NOT NULL, credits TINYINT DEFAULT 3, marks_locked TINYINT(1) DEFAULT 0, FOREIGN KEY (dept_id) REFERENCES departments(id))`,
      `CREATE TABLE IF NOT EXISTS teacher_subjects (id INT AUTO_INCREMENT PRIMARY KEY, teacher_id INT NOT NULL, subject_id INT NOT NULL, academic_year VARCHAR(10) NOT NULL DEFAULT '2024-25', UNIQUE KEY uq_ts (teacher_id, subject_id, academic_year), FOREIGN KEY (teacher_id) REFERENCES teachers(id), FOREIGN KEY (subject_id) REFERENCES subjects(id))`,
      `CREATE TABLE IF NOT EXISTS marks (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, subject_id INT NOT NULL, teacher_id INT, semester TINYINT NOT NULL, internal1 DECIMAL(5,2) DEFAULT 0, internal2 DECIMAL(5,2) DEFAULT 0, internal3 DECIMAL(5,2) DEFAULT 0, internal_converted DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((internal1+internal2+internal3)*40/150,2)) STORED, external DECIMAL(5,2) DEFAULT 0, total DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((internal1+internal2+internal3)*40/150+external,2)) STORED, academic_year VARCHAR(10) DEFAULT '2024-25', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_marks (student_id,subject_id,semester,academic_year), FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (teacher_id) REFERENCES teachers(id))`,
      `CREATE TABLE IF NOT EXISTS achievements (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, title VARCHAR(200) NOT NULL, description TEXT, category ENUM('Technical','Sports','Cultural','Academic','Other') DEFAULT 'Other', year YEAR NOT NULL, added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (student_id) REFERENCES students(id))`,
      `CREATE TABLE IF NOT EXISTS leave_applications (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, from_date DATE NOT NULL, to_date DATE NOT NULL, reason TEXT NOT NULL, leave_type ENUM('Medical','Personal','Family','Academic','Other') NOT NULL, status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending', advisor_remarks TEXT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS subject_queries (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, subject_id INT NOT NULL, teacher_id INT NOT NULL, type ENUM('Doubt','Material Request') NOT NULL, title VARCHAR(200) NOT NULL, body TEXT NOT NULL, status ENUM('Open','Replied','Closed') DEFAULT 'Open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS query_replies (id INT AUTO_INCREMENT PRIMARY KEY, query_id INT NOT NULL, sender_role ENUM('student','teacher') NOT NULL, sender_id INT NOT NULL, message TEXT NOT NULL, attachment_url VARCHAR(255) NULL, sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (query_id) REFERENCES subject_queries(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS announcements (id INT AUTO_INCREMENT PRIMARY KEY, created_by INT NOT NULL, title VARCHAR(200) NOT NULL, body TEXT NOT NULL, target_role ENUM('all','student','teacher') DEFAULT 'all', target_dept_id INT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL)`,
      `CREATE TABLE IF NOT EXISTS announcement_reads (id INT AUTO_INCREMENT PRIMARY KEY, announcement_id INT NOT NULL, user_id INT NOT NULL, read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_read (announcement_id,user_id), FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS export_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, export_type ENUM('StudentList','MarksReport','SubjectAnalysis') NOT NULL, filters JSON NULL, exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS import_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, filename VARCHAR(255) NOT NULL, total_rows INT NOT NULL, success_rows INT NOT NULL, failed_rows INT NOT NULL, errors JSON NULL, imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id INT NOT NULL, old_value JSON NULL, new_value JSON NULL, performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)`,
    ];

    const results = [];
    for (const sql of tables) {
      try { await conn.execute(sql); results.push("✔ OK"); }
      catch (e) { results.push("⚠ " + e.message.slice(0,80)); }
    }

    // Seed admin user
    const bcrypt2 = require("bcryptjs");
    const hash = await bcrypt2.hash("admin123", 10);
    await conn.execute("INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,'admin')",
      ["Principal Admin","admin@apr.edu",hash]);

    await conn.end();
    res.send("<pre>Tables:\n" + results.join("\n") + "\n\n✅ Admin seeded: admin@apr.edu / admin123\n\nNow remove SETUP_SECRET variable.</pre>");
  } catch (e) {
    console.error(e);
    res.status(500).send("Setup failed: " + e.message);
  }
});

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/departments",   require("./routes/departmentRoutes"));
app.use("/api/subjects",      require("./routes/subjectRoutes"));
app.use("/api/students",      require("./routes/importRoutes"));
app.use("/api/students",      require("./routes/studentRoutes"));
app.use("/api/students",      require("./routes/advisorRoutes"));
app.use("/api/teachers",      require("./routes/teacherRoutes"));
app.use("/api/teachers",      require("./routes/advisorRoutes"));
app.use("/api/marks",         require("./routes/marksRoutes"));
app.use("/api/achievements",  require("./routes/achievementRoutes"));
app.use("/api/stats",         require("./routes/statsRoutes"));
app.use("/api/leaves",        require("./routes/leaveRoutes"));
app.use("/api/queries",       require("./routes/queryRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/audit",         require("./routes/auditRoutes"));
app.use("/api/export",        require("./routes/exportRoutes"));

// ── Serve React build in production ───────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, data: null, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
