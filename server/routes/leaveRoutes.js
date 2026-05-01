const express        = require("express");
const router         = express.Router();
const verify         = require("../middleware/verifyToken");
const requireTeacher = require("../middleware/requireTeacher");
const db             = require("../config/db");
const { ok, fail }   = require("../utils/response");
const { logAudit }   = require("../utils/audit");

const requireStudent = (req, res, next) => {
  if (req.user.role !== "student") return res.status(403).json({ success:false, data:null, message:"Student access required" });
  next();
};

// POST /api/leaves — Student applies
router.post("/", verify, requireStudent, async (req, res) => {
  try {
    const { from_date, to_date, reason, leave_type } = req.body;
    if (!from_date || !to_date || !reason || !leave_type)
      return fail(res, "All fields required", 400);
    if (new Date(from_date) > new Date(to_date))
      return fail(res, "from_date must be before or equal to to_date", 400);
    // Compare date strings directly (YYYY-MM-DD format) to avoid timezone issues
    if (from_date < new Date().toISOString().split("T")[0])
      return fail(res, "from_date cannot be in the past", 400);

    const [r] = await db.execute(
      "INSERT INTO leave_applications (student_id, from_date, to_date, reason, leave_type) VALUES (?, ?, ?, ?, ?)",
      [req.user.roleId, from_date, to_date, reason, leave_type]
    );
    return ok(res, { id: r.insertId }, "Leave application submitted", 201);
  } catch (err) {
    return fail(res, "Failed to apply for leave");
  }
});

// GET /api/leaves/my — Student's own leaves
router.get("/my", verify, requireStudent, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM leave_applications WHERE student_id = ? ORDER BY applied_at DESC",
      [req.user.roleId]
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch leaves");
  }
});

// GET /api/leaves/advisees — Teacher sees advisees' leaves
router.get("/advisees", verify, requireTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT la.*, u.name AS student_name, s.reg_no, d.code AS dept, s.year
      FROM leave_applications la
      JOIN students s ON la.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      WHERE s.staff_advisor_id = ?
      ORDER BY la.applied_at DESC
    `, [req.user.roleId]);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch advisee leaves");
  }
});

// PATCH /api/leaves/:id/review — Teacher reviews
router.patch("/:id/review", verify, requireTeacher, async (req, res) => {
  try {
    const { status, advisor_remarks } = req.body;
    if (!["Approved","Rejected"].includes(status))
      return fail(res, "status must be Approved or Rejected", 400);

    const [rows] = await db.execute(`
      SELECT la.id, s.staff_advisor_id
      FROM leave_applications la
      JOIN students s ON la.student_id = s.id
      WHERE la.id = ?
    `, [req.params.id]);
    if (!rows.length) return fail(res, "Leave not found", 404);
    if (rows[0].staff_advisor_id !== req.user.roleId)
      return fail(res, "Not your advisee's leave", 403);

    await db.execute(
      "UPDATE leave_applications SET status=?, advisor_remarks=?, reviewed_at=NOW() WHERE id=?",
      [status, advisor_remarks || null, req.params.id]
    );
    await logAudit({ performed_by: req.user.userId, action: "review_leave",
      entity_type: "Leave", entity_id: Number(req.params.id),
      new_value: { status, advisor_remarks } });

    return ok(res, null, `Leave ${status}`);
  } catch (err) {
    return fail(res, "Failed to review leave");
  }
});

module.exports = router;
