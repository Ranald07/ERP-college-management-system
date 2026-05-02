require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const app     = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Setup route
app.get("/api/setup", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).send("Forbidden");
  try {
    const mysql2 = require("mysql2/promise");
    const bcrypt2 = require("bcryptjs");
    const conn = await mysql2.createConnection({
      host: process.env.DB_HOST, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306, multipleStatements: true,
    });
    const tables = [
      "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, role ENUM('admin','student','teacher') NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS departments (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, code VARCHAR(10) NOT NULL UNIQUE)",
      "CREATE TABLE IF NOT EXISTS students (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, reg_no VARCHAR(20) NOT NULL UNIQUE, dept_id INT NOT NULL, year TINYINT NOT NULL, gender ENUM('Male','Female','Other') NOT NULL, dob DATE NOT NULL, accommodation_type ENUM('Hosteller','Day Scholar') NOT NULL DEFAULT 'Day Scholar', room_no VARCHAR(20), phone VARCHAR(15), photo_url VARCHAR(255), staff_advisor_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (dept_id) REFERENCES departments(id))",
      "CREATE TABLE IF NOT EXISTS teachers (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, employee_id VARCHAR(20) NOT NULL UNIQUE, dept_id INT NOT NULL, designation VARCHAR(100) DEFAULT 'Assistant Professor', phone VARCHAR(15), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (dept_id) REFERENCES departments(id))",
      "ALTER TABLE students ADD CONSTRAINT fk_student_advisor FOREIGN KEY (staff_advisor_id) REFERENCES teachers(id) ON DELETE SET NULL",
      "CREATE TABLE IF NOT EXISTS subjects (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, dept_id INT NOT NULL, year TINYINT NOT NULL, semester TINYINT NOT NULL, credits TINYINT DEFAULT 3, marks_locked TINYINT(1) DEFAULT 0, FOREIGN KEY (dept_id) REFERENCES departments(id))",
      "CREATE TABLE IF NOT EXISTS teacher_subjects (id INT AUTO_INCREMENT PRIMARY KEY, teacher_id INT NOT NULL, subject_id INT NOT NULL, academic_year VARCHAR(10) NOT NULL DEFAULT '2024-25', UNIQUE KEY uq_ts (teacher_id, subject_id, academic_year), FOREIGN KEY (teacher_id) REFERENCES teachers(id), FOREIGN KEY (subject_id) REFERENCES subjects(id))",
      "CREATE TABLE IF NOT EXISTS marks (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, subject_id INT NOT NULL, teacher_id INT, semester TINYINT NOT NULL, internal1 DECIMAL(5,2) DEFAULT 0, internal2 DECIMAL(5,2) DEFAULT 0, internal3 DECIMAL(5,2) DEFAULT 0, internal_converted DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((internal1+internal2+internal3)*40/150,2)) STORED, ext_marks DECIMAL(5,2) DEFAULT 0, total DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((internal1+internal2+internal3)*40/150+ext_marks,2)) STORED, academic_year VARCHAR(10) DEFAULT '2024-25', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_marks (student_id,subject_id,semester,academic_year), FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (teacher_id) REFERENCES teachers(id))",
      "CREATE TABLE IF NOT EXISTS achievements (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, title VARCHAR(200) NOT NULL, description TEXT, category ENUM('Technical','Sports','Cultural','Academic','Other') DEFAULT 'Other', year YEAR NOT NULL, added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (student_id) REFERENCES students(id))",
      "CREATE TABLE IF NOT EXISTS leave_applications (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, from_date DATE NOT NULL, to_date DATE NOT NULL, reason TEXT NOT NULL, leave_type ENUM('Medical','Personal','Family','Academic','Other') NOT NULL, status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending', advisor_remarks TEXT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS subject_queries (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, subject_id INT NOT NULL, teacher_id INT NOT NULL, type ENUM('Doubt','Material Request') NOT NULL, title VARCHAR(200) NOT NULL, body TEXT NOT NULL, status ENUM('Open','Replied','Closed') DEFAULT 'Open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS query_replies (id INT AUTO_INCREMENT PRIMARY KEY, query_id INT NOT NULL, sender_role ENUM('student','teacher') NOT NULL, sender_id INT NOT NULL, message TEXT NOT NULL, attachment_url VARCHAR(255) NULL, sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (query_id) REFERENCES subject_queries(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS announcements (id INT AUTO_INCREMENT PRIMARY KEY, created_by INT NOT NULL, title VARCHAR(200) NOT NULL, body TEXT NOT NULL, target_role ENUM('all','student','teacher') DEFAULT 'all', target_dept_id INT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL)",
      "CREATE TABLE IF NOT EXISTS announcement_reads (id INT AUTO_INCREMENT PRIMARY KEY, announcement_id INT NOT NULL, user_id INT NOT NULL, read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_read (announcement_id,user_id), FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS export_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, export_type ENUM('StudentList','MarksReport','SubjectAnalysis') NOT NULL, filters JSON NULL, exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS import_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, filename VARCHAR(255) NOT NULL, total_rows INT NOT NULL, success_rows INT NOT NULL, failed_rows INT NOT NULL, errors JSON NULL, imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, performed_by INT NOT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id INT NOT NULL, old_value JSON NULL, new_value JSON NULL, performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE)",
    ];
    const results = [];
    for (const sql of tables) {
      try { await conn.execute(sql); results.push("OK"); }
      catch (e) { results.push("SKIP: " + e.message.slice(0,60)); }
    }
    const hash = await bcrypt2.hash("admin123", 10);
    await conn.execute("INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,'admin')",["Principal Admin","admin@apr.edu",hash]);
    await conn.end();
    res.send("<pre>" + results.join("\n") + "\n\nAdmin: admin@apr.edu / admin123\nNow visit /api/seed?secret=... to populate data.</pre>");
  } catch(e) { res.status(500).send("Setup failed: " + e.message); }
});

// Seed route - idempotent
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
    const log = [];
    const upsertUser = async (name, email, password, role) => {
      const hash = await bcrypt2.hash(password, 10);
      await conn.execute("INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,?)",[name,email,hash,role]);
      const [[u]] = await conn.execute("SELECT id FROM users WHERE email=?",[email]);
      return u.id;
    };
    const getId = async (table, col, val) => {
      const [[r]] = await conn.execute("SELECT id FROM " + table + " WHERE " + col + "=?",[val]);
      return r ? r.id : null;
    };

    // Departments
    for (const [name,code] of [["Computer Science & Engineering","CSE"],["Electronics & Communication Engineering","ECE"],["Mechanical Engineering","MECH"],["Civil Engineering","CIVIL"],["Information Technology","IT"],["Electrical & Electronics Engineering","EEE"]])
      await conn.execute("INSERT IGNORE INTO departments (name,code) VALUES (?,?)",[name,code]);
    log.push("Departments OK");

    // Admin
    await upsertUser("Principal Admin","admin@apr.edu","admin123","admin");
    log.push("Admin OK");

    // Teachers
    for (const [name,email,empId,dept,desig] of [
      ["Dr. Ramesh Kumar","ramesh@apr.edu","TCH001","CSE","Professor"],
      ["Dr. Priya Nair","priya@apr.edu","TCH002","CSE","Associate Professor"],
      ["Mr. Suresh Babu","suresh@apr.edu","TCH003","ECE","Assistant Professor"],
      ["Dr. Kavitha R","kavitha@apr.edu","TCH004","ECE","Associate Professor"],
      ["Mr. Arjun Mehta","arjun@apr.edu","TCH005","MECH","Assistant Professor"],
      ["Dr. Lakshmi Devi","lakshmi@apr.edu","TCH006","IT","Professor"],
      ["Mr. Venkat Rao","venkat@apr.edu","TCH007","CIVIL","Assistant Professor"],
      ["Dr. Anitha S","anitha@apr.edu","TCH008","EEE","Associate Professor"],
    ]) {
      const uid = await upsertUser(name,email,"teacher123","teacher");
      const deptId = await getId("departments","code",dept);
      await conn.execute("INSERT IGNORE INTO teachers (user_id,employee_id,dept_id,designation) VALUES (?,?,?,?)",[uid,empId,deptId,desig]);
    }
    log.push("Teachers OK");

    // Students
    for (const [name,email,reg,dept,year,gender,dob,acc,room,phone,advisor] of [
      ["Arun Kumar","arun@apr.edu","22CSE101","CSE",3,"Male","2004-08-15","Hosteller","H-204","9876543210","TCH001"],
      ["Priya S","priya.s@apr.edu","22ECE055","ECE",3,"Female","2004-03-22","Day Scholar",null,"9876500001","TCH003"],
      ["Rahul Verma","rahul@apr.edu","21MECH30","MECH",4,"Male","2003-11-10","Hosteller","H-110","9876500002","TCH005"],
      ["Sneha Patel","sneha@apr.edu","23IT010","IT",2,"Female","2005-06-05","Day Scholar",null,"9876500003","TCH006"],
      ["Karthik R","karthik@apr.edu","22CIVIL20","CIVIL",3,"Male","2004-01-18","Hosteller","H-305","9876500004","TCH007"],
      ["Vikram Singh","vikram@apr.edu","22CSE102","CSE",3,"Male","2004-03-12","Hosteller","H-205","9876501001","TCH001"],
      ["Divya Menon","divya@apr.edu","22CSE103","CSE",3,"Female","2004-07-25","Day Scholar",null,"9876501002","TCH002"],
      ["Sanjay Kumar","sanjay@apr.edu","22ECE056","ECE",3,"Male","2004-09-30","Hosteller","H-111","9876501005","TCH003"],
      ["Preethi S","preethi@apr.edu","22ECE057","ECE",3,"Female","2004-11-14","Day Scholar",null,"9876501006","TCH004"],
      ["Lavanya T","lavanya@apr.edu","21MECH31","MECH",4,"Female","2003-06-05","Day Scholar",null,"9876501008","TCH005"],
      ["Manoj Verma","manoj@apr.edu","21MECH32","MECH",4,"Male","2003-08-17","Hosteller","H-113","9876501009","TCH005"],
      ["Ananya Iyer","ananya@apr.edu","23IT011","IT",2,"Female","2005-03-28","Day Scholar",null,"9876501010","TCH006"],
      ["Rohit Sharma","rohit@apr.edu","23IT012","IT",2,"Male","2005-05-11","Hosteller","H-306","9876501011","TCH006"],
      ["Kavya Nair","kavya@apr.edu","22CIVIL21","CIVIL",3,"Female","2004-12-03","Day Scholar",null,"9876501012","TCH007"],
      ["Meghna Das","meghna@apr.edu","22EEE001","EEE",3,"Female","2004-06-20","Day Scholar",null,"9876501014","TCH008"],
      ["Aditya Raj","aditya@apr.edu","22EEE002","EEE",3,"Male","2004-10-09","Hosteller","H-401","9876501015","TCH008"],
    ]) {
      const uid = await upsertUser(name,email,"student123","student");
      const deptId = await getId("departments","code",dept);
      const advId = await getId("teachers","employee_id",advisor);
      await conn.execute("INSERT IGNORE INTO students (user_id,reg_no,dept_id,year,gender,dob,accommodation_type,room_no,phone,staff_advisor_id) VALUES (?,?,?,?,?,?,?,?,?,?)",[uid,reg,deptId,year,gender,dob,acc,room||null,phone,advId]);
      await conn.execute("UPDATE students SET staff_advisor_id=? WHERE reg_no=? AND staff_advisor_id IS NULL",[advId,reg]);
    }
    log.push("Students OK");

    // Subjects
    for (const [code,name,dept,year,sem,credits] of [
      ["CS501","Data Structures & Algorithms","CSE",3,5,4],["CS502","Operating Systems","CSE",3,5,3],
      ["CS503","Computer Networks","CSE",3,5,3],["CS504","Database Management Systems","CSE",3,5,4],
      ["CS505","Software Engineering","CSE",3,5,3],
      ["EC501","Digital Signal Processing","ECE",3,5,4],["EC502","VLSI Design","ECE",3,5,3],["EC503","Microprocessors","ECE",3,5,3],
      ["ME701","CAD/CAM","MECH",4,7,4],["ME702","Robotics","MECH",4,7,3],["ME703","Industrial Engineering","MECH",4,7,3],
      ["IT301","Python Programming","IT",2,3,4],["IT302","Web Technologies","IT",2,3,3],["IT303","Data Communication","IT",2,3,3],
      ["CV501","Structural Analysis","CIVIL",3,5,4],["CV502","Concrete Technology","CIVIL",3,5,3],["CV503","Fluid Mechanics","CIVIL",3,5,3],
      ["EE501","Power Systems","EEE",3,5,4],["EE502","Control Systems","EEE",3,5,3],
    ]) {
      const deptId = await getId("departments","code",dept);
      await conn.execute("INSERT IGNORE INTO subjects (code,name,dept_id,year,semester,credits) VALUES (?,?,?,?,?,?)",[code,name,deptId,year,sem,credits]);
    }
    log.push("Subjects OK");

    // Teacher-Subject
    for (const [emp,code] of [
      ["TCH001","CS501"],["TCH001","CS502"],["TCH002","CS503"],["TCH002","CS504"],["TCH002","CS505"],
      ["TCH003","EC501"],["TCH003","EC502"],["TCH004","EC503"],
      ["TCH005","ME701"],["TCH005","ME702"],["TCH005","ME703"],
      ["TCH006","IT301"],["TCH006","IT302"],["TCH006","IT303"],
      ["TCH007","CV501"],["TCH007","CV502"],["TCH007","CV503"],
      ["TCH008","EE501"],["TCH008","EE502"],
    ]) {
      const tid = await getId("teachers","employee_id",emp);
      const sid = await getId("subjects","code",code);
      if (tid && sid) await conn.execute("INSERT IGNORE INTO teacher_subjects (teacher_id,subject_id) VALUES (?,?)",[tid,sid]);
    }
    log.push("Teacher-Subject OK");

    // Marks
    for (const [reg,code,emp,sem,i1,i2,i3,ext] of [
      ["22CSE101","CS501","TCH001",5,42,38,44,52],["22CSE101","CS502","TCH001",5,40,41,39,50],
      ["22CSE101","CS503","TCH002",5,44,40,43,55],["22CSE101","CS504","TCH002",5,46,44,45,58],["22CSE101","CS505","TCH002",5,41,43,40,48],
      ["22CSE102","CS501","TCH001",5,38,40,42,48],["22CSE102","CS502","TCH001",5,36,38,37,46],["22CSE102","CS503","TCH002",5,40,39,41,50],
      ["22CSE103","CS501","TCH001",5,45,46,47,56],["22CSE103","CS502","TCH001",5,43,44,45,54],["22CSE103","CS503","TCH002",5,46,45,47,57],
      ["22ECE055","EC501","TCH003",5,36,38,37,45],["22ECE055","EC502","TCH003",5,38,35,37,43],["22ECE055","EC503","TCH004",5,40,39,41,50],
      ["22ECE056","EC501","TCH003",5,32,34,33,42],["22ECE056","EC502","TCH003",5,30,31,32,40],
      ["22ECE057","EC501","TCH003",5,40,42,41,50],["22ECE057","EC502","TCH003",5,38,39,40,48],
      ["21MECH30","ME701","TCH005",7,32,34,33,42],["21MECH30","ME702","TCH005",7,35,33,36,44],["21MECH30","ME703","TCH005",7,30,32,31,40],
      ["21MECH31","ME701","TCH005",7,28,30,29,38],["21MECH31","ME702","TCH005",7,30,29,31,40],
      ["21MECH32","ME701","TCH005",7,36,38,37,46],["21MECH32","ME702","TCH005",7,34,35,36,44],
      ["23IT010","IT301","TCH006",3,47,45,48,58],["23IT010","IT302","TCH006",3,44,46,45,56],["23IT010","IT303","TCH006",3,43,44,46,54],
      ["23IT011","IT301","TCH006",3,44,45,46,55],["23IT011","IT302","TCH006",3,42,43,44,53],
      ["23IT012","IT301","TCH006",3,38,36,37,46],["23IT012","IT302","TCH006",3,35,36,34,44],
      ["22CIVIL20","CV501","TCH007",5,33,35,32,43],["22CIVIL20","CV502","TCH007",5,36,34,35,45],["22CIVIL20","CV503","TCH007",5,30,32,31,40],
      ["22CIVIL21","CV501","TCH007",5,38,40,39,48],["22CIVIL21","CV502","TCH007",5,36,37,38,46],
      ["22EEE001","EE501","TCH008",5,35,37,36,46],["22EEE001","EE502","TCH008",5,33,34,35,44],
      ["22EEE002","EE501","TCH008",5,40,42,41,52],["22EEE002","EE502","TCH008",5,38,39,40,50],
    ]) {
      const stId = await getId("students","reg_no",reg);
      const suId = await getId("subjects","code",code);
      const tId  = await getId("teachers","employee_id",emp);
      if (stId && suId && tId)
        await conn.execute("INSERT IGNORE INTO marks (student_id,subject_id,teacher_id,semester,internal1,internal2,internal3,ext_marks) VALUES (?,?,?,?,?,?,?,?)",[stId,suId,tId,sem,i1,i2,i3,ext]);
    }
    log.push("Marks OK");

    // Achievements
    for (const [reg,title,desc,cat,year] of [
      ["22CSE101","Smart India Hackathon Winner","1st place at SIH 2026","Technical",2026],
      ["22CSE101","Best Student Award","Department topper 2025","Academic",2025],
      ["22ECE055","State Level Chess Champion","Gold medal","Sports",2025],
      ["21MECH30","Paper Presentation Winner","National symposium 2024","Technical",2024],
      ["23IT010","Cultural Fest Best Performer","Dance competition winner","Cultural",2025],
      ["22CSE102","Inter-College Coding Contest","1st place at CodeFest 2026","Technical",2026],
      ["22CSE103","University Rank Holder","Top 10 in university 2025","Academic",2025],
    ]) {
      const stId = await getId("students","reg_no",reg);
      if (stId) await conn.execute("INSERT INTO achievements (student_id,title,description,category,year) VALUES (?,?,?,?,?)",[stId,title,desc,cat,year]);
    }
    log.push("Achievements OK");

    // Leaves
    for (const [reg,from,to,reason,type,status,remarks] of [
      ["22CSE101","2026-06-10","2026-06-12","Medical checkup and rest","Medical","Pending",null],
      ["22CSE101","2026-05-20","2026-05-21","Family function attendance","Family","Approved","Approved. Attend classes on return."],
      ["22ECE055","2026-06-15","2026-06-15","Personal work at home town","Personal","Pending",null],
      ["21MECH30","2026-06-20","2026-06-22","Fever and doctor visit","Medical","Pending",null],
      ["23IT010","2026-05-15","2026-05-16","Family wedding","Family","Approved","Approved."],
    ]) {
      const stId = await getId("students","reg_no",reg);
      if (stId) await conn.execute("INSERT INTO leave_applications (student_id,from_date,to_date,reason,leave_type,status,advisor_remarks) VALUES (?,?,?,?,?,?,?)",[stId,from,to,reason,type,status,remarks||null]);
    }
    log.push("Leaves OK");

    // Announcements
    const [[adminU]] = await conn.execute("SELECT id FROM users WHERE email='admin@apr.edu'");
    for (const [title,body,role] of [
      ["End Semester Examination Schedule Released","The end semester examination schedule has been released. Students are advised to check and prepare accordingly.","all"],
      ["Internal Assessment Marks Deadline","All faculty must submit internal marks for Semester 5 and 7 by June 30, 2026.","teacher"],
      ["Scholarship Application Portal Open","Students eligible for merit scholarships can apply from June 1 to June 20, 2026.","student"],
    ]) await conn.execute("INSERT INTO announcements (created_by,title,body,target_role) VALUES (?,?,?,?)",[adminU.id,title,body,role]);
    log.push("Announcements OK");

    await conn.end();
    res.send("<pre>" + log.join("\n") + "\n\nSeed complete!\nCredentials:\n  admin@apr.edu / admin123\n  arun@apr.edu / student123\n  ramesh@apr.edu / teacher123\n  (all students: student123, all teachers: teacher123)\n\nRemove SETUP_SECRET now.</pre>");
  } catch(e) { console.error(e); res.status(500).send("Seed failed: " + e.message); }
});

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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, data: null, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));
