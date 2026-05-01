-- Run this in phpMyAdmin or MySQL CLI
-- Creates database and all tables
-- Marks are out of 100: internal1+2+3 max 40 (each ~13), external max 60

CREATE DATABASE IF NOT EXISTS college_erp;
USE college_erp;

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','student','teacher') NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Departments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE,
  code  VARCHAR(10) NOT NULL UNIQUE
);

-- ── Students ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL UNIQUE,
  reg_no             VARCHAR(20) NOT NULL UNIQUE,
  dept_id            INT NOT NULL,
  year               TINYINT NOT NULL,
  gender             ENUM('Male','Female','Other') NOT NULL,
  dob                DATE NOT NULL,
  accommodation_type ENUM('Hosteller','Day Scholar') NOT NULL DEFAULT 'Day Scholar',
  room_no            VARCHAR(20),
  phone              VARCHAR(15),
  photo_url          VARCHAR(255),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- ── Teachers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  employee_id  VARCHAR(20) NOT NULL UNIQUE,
  dept_id      INT NOT NULL,
  designation  VARCHAR(100) DEFAULT 'Assistant Professor',
  phone        VARCHAR(15),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- ── Subjects ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  code      VARCHAR(20) NOT NULL UNIQUE,
  name      VARCHAR(100) NOT NULL,
  dept_id   INT NOT NULL,
  year      TINYINT NOT NULL,
  semester  TINYINT NOT NULL,
  credits   TINYINT DEFAULT 3,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- ── Teacher-Subject assignments ────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id    INT NOT NULL,
  subject_id    INT NOT NULL,
  academic_year VARCHAR(10) NOT NULL DEFAULT '2024-25',
  UNIQUE KEY uq_teacher_subject (teacher_id, subject_id, academic_year),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ── Marks (total = 100 per subject) ───────────────────────
-- Each internal test: max 50 (raw)
-- Sum of 3 internals (max 150) converted to 40: stored as converted value
-- external: max 60
-- total (generated) = internal_converted + external = max 100
CREATE TABLE IF NOT EXISTS marks (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  student_id         INT NOT NULL,
  subject_id         INT NOT NULL,
  teacher_id         INT,
  semester           TINYINT NOT NULL,
  internal1          DECIMAL(5,2) DEFAULT 0,   -- raw /50
  internal2          DECIMAL(5,2) DEFAULT 0,   -- raw /50
  internal3          DECIMAL(5,2) DEFAULT 0,   -- raw /50
  internal_converted DECIMAL(5,2) GENERATED ALWAYS AS
                     (ROUND((internal1 + internal2 + internal3) * 40 / 150, 2)) STORED,
  external           DECIMAL(5,2) DEFAULT 0,   -- max 60
  total              DECIMAL(5,2) GENERATED ALWAYS AS
                     (ROUND((internal1 + internal2 + internal3) * 40 / 150 + external, 2)) STORED,
  academic_year      VARCHAR(10) DEFAULT '2024-25',
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marks (student_id, subject_id, semester, academic_year),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ── Achievements ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  category    ENUM('Technical','Sports','Cultural','Academic','Other') DEFAULT 'Other',
  year        YEAR NOT NULL,
  added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- ── marks_locked column on subjects ───────────────────────
-- Run: ALTER TABLE subjects ADD COLUMN IF NOT EXISTS marks_locked TINYINT(1) DEFAULT 0;
-- (handled in migration script below)

-- ── Staff advisor on students ──────────────────────────────
-- Run: ALTER TABLE students ADD COLUMN IF NOT EXISTS staff_advisor_id INT NULL,
--      ADD CONSTRAINT fk_student_advisor FOREIGN KEY (staff_advisor_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- ── Leave applications ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_applications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT NOT NULL,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  reason          TEXT NOT NULL,
  leave_type      ENUM('Medical','Personal','Family','Academic','Other') NOT NULL,
  status          ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  advisor_remarks TEXT NULL,
  applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at     TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ── Subject Q&A ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subject_queries (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,
  subject_id  INT NOT NULL,
  teacher_id  INT NOT NULL,
  type        ENUM('Doubt','Material Request') NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  status      ENUM('Open','Replied','Closed') DEFAULT 'Open',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- ── Query replies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_replies (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  query_id       INT NOT NULL,
  sender_role    ENUM('student','teacher') NOT NULL,
  sender_id      INT NOT NULL,
  message        TEXT NOT NULL,
  attachment_url VARCHAR(255) NULL,
  sent_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES subject_queries(id) ON DELETE CASCADE
);

-- ── Export log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS export_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  performed_by INT NOT NULL,
  export_type  ENUM('StudentList','MarksReport','SubjectAnalysis') NOT NULL,
  filters      JSON NULL,
  exported_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Audit log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  performed_by INT NOT NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    INT NOT NULL,
  old_value    JSON NULL,
  new_value    JSON NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Announcements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  created_by     INT NOT NULL,
  title          VARCHAR(200) NOT NULL,
  body           TEXT NOT NULL,
  target_role    ENUM('all','student','teacher') DEFAULT 'all',
  target_dept_id INT NULL,
  is_active      TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ── Announcement reads ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_reads (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id  INT NOT NULL,
  user_id          INT NOT NULL,
  read_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_read (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Bulk import log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  performed_by INT NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  total_rows   INT NOT NULL,
  success_rows INT NOT NULL,
  failed_rows  INT NOT NULL,
  errors       JSON NULL,
  imported_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);
