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

// ── One-time seed route ────────────────────────────────────
app.get("/api/seed", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).send("Forbidden");
  try {
    const mysql2 = require("mysql2/promise");
    const bcrypt2 = require("bcryptjs");
    const conn = await mysql2.createConnection({
      host: process.env.DB_HOST, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    const tHash = await bcrypt2.hash("teacher123", 10);
    const sHash = await bcrypt2.hash("student123", 10);

    // Teachers
    const teachers = [
      ["Dr. Ramesh Kumar","ramesh@apr.edu","TCH001","CSE","Professor"],
      ["Dr. Priya Nair","priya@apr.edu","TCH002","CSE","Associate Professor"],
      ["Mr. Suresh Babu","suresh@apr.edu","TCH003","ECE","Assistant Professor"],
      ["Dr. Kavitha R","kavitha@apr.edu","TCH004","ECE","Associate Professor"],
      ["Mr. Arjun Mehta","arjun@apr.edu","TCH005","MECH","Assistant Professor"],
      ["Dr. Lakshmi Devi","lakshmi@apr.edu","TCH006","IT","Professor"],
      ["Mr. Venkat Rao","venkat@apr.edu","TCH007","CIVIL","Assistant Professor"],
      ["Dr. Anitha S","anitha@apr.edu","TCH008","EEE","Associate Professor"],
    ];
    for (const [name,email,empId,dept,desig] of teachers) {
      await conn.execute("INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,'teacher')",[name,email,tHash]);
      const [[u]] = await conn.execute("SELECT id FROM users WHERE email=?",[email]);
      const [[d]] = await conn.execute("SELECT id FROM departments WHERE code=?",[dept]);
      await conn.execute("INSERT IGNORE INTO teachers (user_id,employee_id,dept_id,designation) VALUES (?,?,?,?)",[u.id,empId,d.id,desig]);
    }

    // Students
    const students = [
      ["Arun Kumar","arun@apr.edu","22CSE101","CSE",3,"Male","2004-08-15","Hosteller","H-204","9876543210","TCH001"],
      ["Priya S","priya.s@apr.edu","22ECE055","ECE",3,"Female","2004-03-22","Day Scholar",null,"9876500001","TCH003"],
      ["Rahul Verma","rahul@apr.edu","21MECH30","MECH",4,"Male","2003-11-10","Hosteller","H-110","9876500002","TCH005"],
      ["Sneha Patel","sneha@apr.edu","23IT010","IT",2,"Female","2005-06-05","Day Scholar",null,"9876500003","TCH006"],
      ["Karthik R","karthik@apr.edu","22CIVIL20","CIVIL",3,"Male","2004-01-18","Hosteller","H-305","9876500004","TCH007"],
    ];
    for (const [name,email,reg,dept,year,gender,dob,acc,room,phone,advisor] of students) {
      await conn.execute("INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,'student')",[name,email,sHash]);
      const [[u]] = await conn.execute("SELECT id FROM users WHERE email=?",[email]);
      const [[d]] = await conn.execute("SELECT id FROM departments WHERE code=?",[dept]);
      const [[t]] = await conn.execute("SELECT id FROM teachers WHERE employee_id=?",[advisor]);
      await conn.execute("INSERT IGNORE INTO students (user_id,reg_no,dept_id,year,gender,dob,accommodation_type,room_no,phone,staff_advisor_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [u.id,reg,d.id,year,gender,dob,acc,room||null,phone,t.id]);
    }

    // Subjects
    const subjects = [
      ["CS501","Data Structures & Algorithms","CSE",3,5,4],
      ["CS502","Operating Systems","CSE",3,5,3],
      ["CS503","Computer Networks","CSE",3,5,3],
      ["CS504","Database Management Systems","CSE",3,5,4],
      ["CS505","Software Engineering","CSE",3,5,3],
      ["EC501","Digital Signal Processing","ECE",3,5,4],
      ["EC502","VLSI Design","ECE",3,5,3],
      ["EC503","Microprocessors","ECE",3,5,3],
      ["ME701","CAD/CAM","MECH",4,7,4],
      ["ME702","Robotics","MECH",4,7,3],
      ["ME703","Industrial Engineering","MECH",4,7,3],
      ["IT301","Python Programming","IT",2,3,4],
      ["IT302","Web Technologies","IT",2,3,3],
      ["IT303","Data Communication","IT",2,3,3],
      ["CV501","Structural Analysis","CIVIL",3,5,4],
      ["CV502","Concrete Technology","CIVIL",3,5,3],
      ["CV503","Fluid Mechanics","CIVIL",3,5,3],
    ];
    for (const [code,name,dept,year,sem,credits] of subjects) {
      const [[d]] = await conn.execute("SELECT id FROM departments WHERE code=?",[dept]);
      await conn.execute("INSERT IGNORE INTO subjects (code,name,dept_id,year,semester,credits) VALUES (?,?,?,?,?,?)",[code,name,d.id,year,sem,credits]);
    }

    // Teacher-Subject assignments
    const assignments = [
      ["TCH001","CS501"],["TCH001","CS502"],["TCH002","CS503"],["TCH002","CS504"],["TCH002","CS505"],
      ["TCH003","EC501"],["TCH003","EC502"],["TCH004","EC503"],
      ["TCH005","ME701"],["TCH005","ME702"],["TCH005","ME703"],
      ["TCH006","IT301"],["TCH006","IT302"],["TCH006","IT303"],
      ["TCH007","CV501"],["TCH007","CV502"],["TCH007","CV503"],
    ];
    for (const [emp,code] of assignments) {
      const [[t]] = await conn.execute("SELECT id FROM teachers WHERE employee_id=?",[emp]);
      const [[s]] = await conn.execute("SELECT id FROM subjects WHERE code=?",[code]);
      await conn.execute("INSERT IGNORE INTO teacher_subjects (teacher_id,subject_id) VALUES (?,?)",[t.id,s.id]);
    }

    // Marks
    const marks = [
      ["22CSE101","CS501","TCH001",5,42,38,44,52],
      ["22CSE101","CS502","TCH001",5,40,41,39,50],
      ["22CSE101","CS503","TCH002",5,44,40,43,55],
      ["22ECE055","EC501","TCH003",5,36,38,37,45],
      ["22ECE055","EC502","TCH003",5,38,35,37,43],
      ["21MECH30","ME701","TCH005",7,32,34,33,42],
      ["21MECH30","ME702","TCH005",7,35,33,36,44],
      ["23IT010","IT301","TCH006",3,47,45,48,58],
      ["23IT010","IT302","TCH006",3,44,46,45,56],
      ["22CIVIL20","CV501","TCH007",5,33,35,32,43],
      ["22CIVIL20","CV502","TCH007",5,36,34,35,45],
    ];
    for (const [reg,code,emp,sem,i1,i2,i3,ext] of marks) {
      const [[st]] = await conn.execute("SELECT id FROM students WHERE reg_no=?",[reg]);
      const [[su]] = await conn.execute("SELECT id FROM subjects WHERE code=?",[code]);
      const [[t]]  = await conn.execute("SELECT id FROM teachers WHERE employee_id=?",[emp]);
      await conn.execute(
        "INSERT IGNORE INTO marks (student_id,subject_id,teacher_id,semester,internal1,internal2,internal3,`external`) VALUES (?,?,?,?,?,?,?,?)",
        [st.id,su.id,t.id,sem,i1,i2,i3,ext]
      );
    }

    // Announcement
    const [[admin]] = await conn.execute("SELECT id FROM users WHERE email='admin@apr.edu'");
    await conn.execute("INSERT IGNORE INTO announcements (created_by,title,body,target_role) VALUES (?,?,?,'all')",
      [admin.id,"Welcome to APR College ERP","Login with your credentials to access the system."]);

    await conn.end();
    res.send("✅ Seed complete! All teachers, students, subjects, marks and announcements added.");
  } catch(e) {
    console.error(e);
    res.status(500).send("Seed failed: " + e.message);
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
