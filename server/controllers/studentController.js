const bcrypt       = require("bcryptjs");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.getAllStudents = async (req, res) => {
  try {
    const { dept, year, search } = req.query;
    let sql = `
      SELECT s.id, s.reg_no, s.year, s.gender, s.dob,
             s.accommodation_type, s.room_no, s.phone, s.photo_url,
             s.dept_id, s.staff_advisor_id, s.created_at,
             u.name, u.email,
             d.code AS dept, d.name AS dept_name,
             adv.name AS advisor_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      LEFT JOIN teachers t_adv ON s.staff_advisor_id = t_adv.id
      LEFT JOIN users adv ON t_adv.user_id = adv.id
      WHERE 1=1
    `;
    const params = [];
    if (dept)   { sql += " AND d.code = ?";                          params.push(dept); }
    if (year)   { sql += " AND s.year = ?";                          params.push(year); }
    if (search) { sql += " AND (u.name LIKE ? OR s.reg_no LIKE ?)";  params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY u.name";

    const [rows] = await db.execute(sql, params);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch students");
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.reg_no, s.year, s.gender, s.dob,
             s.accommodation_type, s.room_no, s.phone, s.photo_url,
             s.dept_id, s.staff_advisor_id, s.created_at,
             u.name, u.email,
             d.code AS dept, d.name AS dept_name,
             adv.name AS advisor_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      LEFT JOIN teachers t_adv ON s.staff_advisor_id = t_adv.id
      LEFT JOIN users adv ON t_adv.user_id = adv.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!rows.length) return fail(res, "Student not found", 404);
    return ok(res, rows[0]);
  } catch (err) {
    return fail(res, "Failed to fetch student");
  }
};

exports.createStudent = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      reg_no, name, email, password = "student123",
      dept_id, year, gender, dob,
      accommodation_type, room_no, phone, photo_url,
    } = req.body;

    if (!reg_no || !name || !email || !dept_id || !year || !gender || !dob || !accommodation_type)
      return fail(res, "Missing required fields", 400);

    const hash = await bcrypt.hash(password, 10);
    const [uRes] = await conn.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')",
      [name, email, hash]
    );
    await conn.execute(
      `INSERT INTO students
         (user_id, reg_no, dept_id, year, gender, dob, accommodation_type, room_no, phone, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uRes.insertId, reg_no, dept_id, year, gender, dob,
       accommodation_type, room_no || null, phone || null, photo_url || null]
    );
    await conn.commit();
    return ok(res, null, "Student created", 201);
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY")
      return fail(res, "Registration number or email already exists", 409);
    return fail(res, "Failed to create student");
  } finally { conn.release(); }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, dept_id, year, gender, dob, accommodation_type, room_no, phone, photo_url } = req.body;
    const [rows] = await db.execute("SELECT user_id FROM students WHERE id = ?", [req.params.id]);
    if (!rows.length) return fail(res, "Student not found", 404);

    await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, rows[0].user_id]);
    await db.execute(
      `UPDATE students SET dept_id=?, year=?, gender=?, dob=?,
         accommodation_type=?, room_no=?, phone=?, photo_url=?
       WHERE id=?`,
      [dept_id, year, gender, dob, accommodation_type,
       room_no || null, phone || null, photo_url || null, req.params.id]
    );
    return ok(res, null, "Student updated");
  } catch (err) {
    return fail(res, "Failed to update student");
  }
};
