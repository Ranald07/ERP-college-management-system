const bcrypt       = require("bcryptjs");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.getAllTeachers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.employee_id, t.designation, t.phone, t.dept_id,
             u.name, u.email,
             d.code AS dept, d.name AS dept_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN departments d ON t.dept_id = d.id
      ORDER BY u.name
    `);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch teachers");
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id, t.employee_id, t.designation, t.phone, t.dept_id,
             u.name, u.email,
             d.code AS dept, d.name AS dept_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN departments d ON t.dept_id = d.id
      WHERE t.id = ?
    `, [req.params.id]);
    if (!rows.length) return fail(res, "Teacher not found", 404);

    const [subjects] = await db.execute(`
      SELECT s.id, s.code, s.name, s.semester, s.year, s.credits,
             d.code AS dept_code, d.name AS dept_name
      FROM teacher_subjects ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN departments d ON s.dept_id = d.id
      WHERE ts.teacher_id = ?
      ORDER BY s.semester, s.name
    `, [req.params.id]);

    return ok(res, { ...rows[0], subjects });
  } catch (err) {
    return fail(res, "Failed to fetch teacher");
  }
};

exports.createTeacher = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { name, email, password = "teacher123", employee_id, dept_id, designation, phone } = req.body;
    if (!name || !email || !employee_id || !dept_id)
      return fail(res, "Missing required fields", 400);

    const hash = await bcrypt.hash(password, 10);
    const [uRes] = await conn.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'teacher')",
      [name, email, hash]
    );
    await conn.execute(
      "INSERT INTO teachers (user_id, employee_id, dept_id, designation, phone) VALUES (?, ?, ?, ?, ?)",
      [uRes.insertId, employee_id, dept_id, designation || "Assistant Professor", phone || null]
    );
    await conn.commit();
    return ok(res, null, "Teacher created", 201);
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY")
      return fail(res, "Employee ID or email already exists", 409);
    return fail(res, "Failed to create teacher");
  } finally { conn.release(); }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, dept_id, designation, phone } = req.body;
    const [rows] = await db.execute("SELECT user_id FROM teachers WHERE id = ?", [req.params.id]);
    if (!rows.length) return fail(res, "Teacher not found", 404);

    await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, rows[0].user_id]);
    await db.execute(
      "UPDATE teachers SET dept_id = ?, designation = ?, phone = ? WHERE id = ?",
      [dept_id, designation, phone || null, req.params.id]
    );
    return ok(res, null, "Teacher updated");
  } catch (err) {
    return fail(res, "Failed to update teacher");
  }
};

exports.deleteTeacher = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT user_id FROM teachers WHERE id = ?", [req.params.id]);
    if (!rows.length) return fail(res, "Teacher not found", 404);

    await conn.execute("DELETE FROM teacher_subjects WHERE teacher_id = ?", [req.params.id]);
    await conn.execute("UPDATE marks SET teacher_id = NULL WHERE teacher_id = ?", [req.params.id]);
    await conn.execute("DELETE FROM teachers WHERE id = ?", [req.params.id]);
    await conn.execute("DELETE FROM users WHERE id = ?", [rows[0].user_id]);
    await conn.commit();
    return ok(res, null, "Teacher deleted");
  } catch (err) {
    await conn.rollback();
    return fail(res, "Failed to delete teacher");
  } finally { conn.release(); }
};

exports.updateSubjectAssignments = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { subject_ids = [] } = req.body;
    await conn.execute("DELETE FROM teacher_subjects WHERE teacher_id = ?", [req.params.id]);
    for (const sid of subject_ids) {
      await conn.execute(
        "INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)",
        [req.params.id, sid]
      );
    }
    await conn.commit();
    return ok(res, null, "Subject assignments updated");
  } catch (err) {
    await conn.rollback();
    return fail(res, "Failed to update assignments");
  } finally { conn.release(); }
};

// Teacher: own subjects
exports.getMySubjects = async (req, res) => {
  try {
    const [subjects] = await db.execute(`
      SELECT s.id, s.code, s.name, s.semester, s.year, s.credits,
             d.code AS dept_code, d.name AS dept_name
      FROM teacher_subjects ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN departments d ON s.dept_id = d.id
      WHERE ts.teacher_id = ?
      ORDER BY s.semester, s.name
    `, [req.user.roleId]);
    return ok(res, subjects);
  } catch (err) {
    return fail(res, "Failed to fetch subjects");
  }
};

// Teacher: students enrolled in a subject (via dept + year match)
exports.getStudentsForSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const teacherId = req.user.roleId;

    const [check] = await db.execute(
      "SELECT id FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?",
      [teacherId, subjectId]
    );
    if (!check.length) return fail(res, "Not assigned to this subject", 403);

    const [sub] = await db.execute("SELECT * FROM subjects WHERE id = ?", [subjectId]);
    if (!sub.length) return fail(res, "Subject not found", 404);

    const [students] = await db.execute(`
      SELECT s.id, s.reg_no, s.year,
             u.name, u.email,
             COALESCE(m.internal1, 0) AS internal1,
             COALESCE(m.internal2, 0) AS internal2,
             COALESCE(m.internal3, 0) AS internal3,
             COALESCE(m.external,  0) AS external,
             m.total, m.id AS marks_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN marks m
        ON m.student_id = s.id
        AND m.subject_id = ?
        AND m.semester   = ?
      WHERE s.dept_id = ? AND s.year = ?
      ORDER BY u.name
    `, [subjectId, sub[0].semester, sub[0].dept_id, sub[0].year]);

    return ok(res, { subject: sub[0], students });
  } catch (err) {
    return fail(res, "Failed to fetch students for subject");
  }
};
