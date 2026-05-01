const express        = require("express");
const router         = express.Router();
const verify         = require("../middleware/verifyToken");
const requireAdmin   = require("../middleware/requireAdmin");
const requireTeacher = require("../middleware/requireTeacher");
const db             = require("../config/db");
const { ok, fail }   = require("../utils/response");
const { logAudit }   = require("../utils/audit");

// PUT /api/students/:id/advisor — Admin assigns advisor to student
router.put("/:id/advisor", verify, requireAdmin, async (req, res) => {
  try {
    const { teacher_id } = req.body;
    const studentId = req.params.id;

    // Allow null to unassign
    if (teacher_id) {
      const [tRows] = await db.execute("SELECT id FROM teachers WHERE id = ?", [teacher_id]);
      if (!tRows.length) return fail(res, "Teacher not found", 404);
    }

    const [rows] = await db.execute("SELECT id FROM students WHERE id = ?", [studentId]);
    if (!rows.length) return fail(res, "Student not found", 404);

    await db.execute("UPDATE students SET staff_advisor_id = ? WHERE id = ?",
      [teacher_id || null, studentId]);

    await logAudit({
      performed_by: req.user.userId, action: "assign_advisor",
      entity_type: "Student", entity_id: Number(studentId),
      new_value: { teacher_id: teacher_id || null },
    });

    return ok(res, null, "Advisor assigned");
  } catch (err) {
    return fail(res, "Failed to assign advisor");
  }
});

// GET /api/teachers/my-advisees — Teacher gets their advisees
router.get("/my-advisees", verify, requireTeacher, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.reg_no, s.year, s.accommodation_type,
             u.name, u.email,
             d.code AS dept, d.name AS dept_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      WHERE s.staff_advisor_id = ?
      ORDER BY u.name
    `, [req.user.roleId]);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch advisees");
  }
});

module.exports = router;
