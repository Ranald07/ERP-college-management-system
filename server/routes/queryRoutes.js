const express        = require("express");
const router         = express.Router();
const verify         = require("../middleware/verifyToken");
const requireTeacher = require("../middleware/requireTeacher");
const db             = require("../config/db");
const { ok, fail }   = require("../utils/response");

const requireStudent = (req, res, next) => {
  if (req.user.role !== "student") return res.status(403).json({ success:false, data:null, message:"Student access required" });
  next();
};

// POST /api/queries — Student creates query
router.post("/", verify, requireStudent, async (req, res) => {
  try {
    const { subject_id, title, body, type } = req.body;
    if (!subject_id || !title || !body || !type)
      return fail(res, "All fields required", 400);

    // Resolve teacher for this subject
    const [ts] = await db.execute(
      "SELECT teacher_id FROM teacher_subjects WHERE subject_id = ? ORDER BY academic_year DESC LIMIT 1",
      [subject_id]
    );
    if (!ts.length) return fail(res, "No teacher assigned to this subject", 404);

    const [r] = await db.execute(
      "INSERT INTO subject_queries (student_id, subject_id, teacher_id, type, title, body) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.roleId, subject_id, ts[0].teacher_id, type, title, body]
    );
    return ok(res, { id: r.insertId }, "Query submitted", 201);
  } catch (err) {
    return fail(res, "Failed to submit query");
  }
});

// GET /api/queries/my — Student's own queries
router.get("/my", verify, requireStudent, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT q.id, q.title, q.type, q.status, q.created_at,
             s.name AS subject_name, s.code AS subject_code,
             u.name AS teacher_name,
             (SELECT message FROM query_replies WHERE query_id = q.id ORDER BY sent_at DESC LIMIT 1) AS latest_reply
      FROM subject_queries q
      JOIN subjects s ON q.subject_id = s.id
      JOIN teachers t ON q.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE q.student_id = ?
      ORDER BY q.created_at DESC
    `, [req.user.roleId]);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch queries");
  }
});

// GET /api/queries/teacher/inbox — Teacher inbox
router.get("/teacher/inbox", verify, requireTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT q.id, q.title, q.type, q.status, q.created_at,
             s.name AS subject_name, s.code AS subject_code,
             u.name AS student_name, st.reg_no,
             (SELECT message FROM query_replies WHERE query_id = q.id ORDER BY sent_at DESC LIMIT 1) AS latest_reply
      FROM subject_queries q
      JOIN subjects s ON q.subject_id = s.id
      JOIN students st ON q.student_id = st.id
      JOIN users u ON st.user_id = u.id
      WHERE q.teacher_id = ?
      ORDER BY q.created_at DESC
    `, [req.user.roleId]);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch inbox");
  }
});

// GET /api/queries/:id — Full query + replies
router.get("/:id", verify, async (req, res) => {
  try {
    const [qRows] = await db.execute(`
      SELECT q.*, s.name AS subject_name, s.code AS subject_code,
             u_s.name AS student_name, st.reg_no,
             u_t.name AS teacher_name
      FROM subject_queries q
      JOIN subjects s ON q.subject_id = s.id
      JOIN students st ON q.student_id = st.id
      JOIN users u_s ON st.user_id = u_s.id
      JOIN teachers t ON q.teacher_id = t.id
      JOIN users u_t ON t.user_id = u_t.id
      WHERE q.id = ?
    `, [req.params.id]);
    if (!qRows.length) return fail(res, "Query not found", 404);

    const q = qRows[0];
    const isStudent = req.user.role === "student" && req.user.roleId === q.student_id;
    const isTeacher = (req.user.role === "teacher" && req.user.roleId === q.teacher_id) || req.user.role === "admin";
    if (!isStudent && !isTeacher) return fail(res, "Access denied", 403);

    const [replies] = await db.execute(
      "SELECT * FROM query_replies WHERE query_id = ? ORDER BY sent_at ASC",
      [req.params.id]
    );
    return ok(res, { ...q, replies });
  } catch (err) {
    return fail(res, "Failed to fetch query");
  }
});

// POST /api/queries/:id/reply
router.post("/:id/reply", verify, async (req, res) => {
  try {
    const { message, attachment_url } = req.body;
    if (!message) return fail(res, "Message required", 400);

    const [qRows] = await db.execute("SELECT * FROM subject_queries WHERE id = ?", [req.params.id]);
    if (!qRows.length) return fail(res, "Query not found", 404);
    const q = qRows[0];

    const isStudent = req.user.role === "student" && req.user.roleId === q.student_id;
    const isTeacher = (req.user.role === "teacher" && req.user.roleId === q.teacher_id) || req.user.role === "admin";
    if (!isStudent && !isTeacher) return fail(res, "Access denied", 403);

    const sender_role = req.user.role === "student" ? "student" : "teacher";
    const sender_id   = req.user.roleId;

    await db.execute(
      "INSERT INTO query_replies (query_id, sender_role, sender_id, message, attachment_url) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, sender_role, sender_id, message, attachment_url || null]
    );

    // Update status
    let newStatus = "Replied";
    if (isStudent && q.status === "Closed") newStatus = "Open";
    await db.execute("UPDATE subject_queries SET status = ? WHERE id = ?", [newStatus, req.params.id]);

    return ok(res, null, "Reply sent");
  } catch (err) {
    return fail(res, "Failed to send reply");
  }
});

// PATCH /api/queries/:id/close — Teacher closes
router.patch("/:id/close", verify, requireTeacher, async (req, res) => {
  try {
    const [qRows] = await db.execute("SELECT * FROM subject_queries WHERE id = ?", [req.params.id]);
    if (!qRows.length) return fail(res, "Query not found", 404);
    if (req.user.role === "teacher" && qRows[0].teacher_id !== req.user.roleId)
      return fail(res, "Not your query", 403);

    await db.execute("UPDATE subject_queries SET status = 'Closed' WHERE id = ?", [req.params.id]);
    return ok(res, null, "Query closed");
  } catch (err) {
    return fail(res, "Failed to close query");
  }
});

module.exports = router;
