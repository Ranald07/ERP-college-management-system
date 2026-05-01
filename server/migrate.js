require("dotenv").config();
const mysql = require("mysql2/promise");

const run = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "college_erp",
    multipleStatements: true,
  });

  console.log("🔧 Running migrations...\n");

  // 1. Add marks_locked to subjects
  try {
    await conn.execute("ALTER TABLE subjects ADD COLUMN marks_locked TINYINT(1) DEFAULT 0");
    console.log("✔ Added marks_locked to subjects");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") console.log("⚠ marks_locked already exists");
    else throw e;
  }

  // 2. Add staff_advisor_id to students
  try {
    await conn.execute("ALTER TABLE students ADD COLUMN staff_advisor_id INT NULL");
    console.log("✔ Added staff_advisor_id to students");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") console.log("⚠ staff_advisor_id already exists");
    else throw e;
  }

  // 3. Add FK for staff_advisor_id (ignore if exists)
  try {
    await conn.execute(
      "ALTER TABLE students ADD CONSTRAINT fk_student_advisor FOREIGN KEY (staff_advisor_id) REFERENCES teachers(id) ON DELETE SET NULL"
    );
    console.log("✔ Added FK fk_student_advisor");
  } catch (e) {
    if (e.code === "ER_DUP_KEY" || e.errno === 1826 || e.message.includes("Duplicate")) {
      console.log("⚠ FK fk_student_advisor already exists");
    } else throw e;
  }

  // 4. Create new tables
  const tables = [
    {
      name: "leave_applications",
      sql: `CREATE TABLE IF NOT EXISTS leave_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        reason TEXT NOT NULL,
        leave_type ENUM('Medical','Personal','Family','Academic','Other') NOT NULL,
        status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
        advisor_remarks TEXT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "subject_queries",
      sql: `CREATE TABLE IF NOT EXISTS subject_queries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        teacher_id INT NOT NULL,
        type ENUM('Doubt','Material Request') NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        status ENUM('Open','Replied','Closed') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "query_replies",
      sql: `CREATE TABLE IF NOT EXISTS query_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query_id INT NOT NULL,
        sender_role ENUM('student','teacher') NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        attachment_url VARCHAR(255) NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (query_id) REFERENCES subject_queries(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "export_logs",
      sql: `CREATE TABLE IF NOT EXISTS export_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        performed_by INT NOT NULL,
        export_type ENUM('StudentList','MarksReport','SubjectAnalysis') NOT NULL,
        filters JSON NULL,
        exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "audit_logs",
      sql: `CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        performed_by INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        old_value JSON NULL,
        new_value JSON NULL,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "announcements",
      sql: `CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        created_by INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        target_role ENUM('all','student','teacher') DEFAULT 'all',
        target_dept_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL
      )`,
    },
    {
      name: "announcement_reads",
      sql: `CREATE TABLE IF NOT EXISTS announcement_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        announcement_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_read (announcement_id, user_id),
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
    {
      name: "import_logs",
      sql: `CREATE TABLE IF NOT EXISTS import_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        performed_by INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        total_rows INT NOT NULL,
        success_rows INT NOT NULL,
        failed_rows INT NOT NULL,
        errors JSON NULL,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
  ];

  for (const t of tables) {
    await conn.execute(t.sql);
    console.log(`✔ Table ${t.name} ready`);
  }

  await conn.end();
  console.log("\n✅ Migration complete!");
};

run().catch(err => { console.error("❌ Migration failed:", err.message); process.exit(1); });
