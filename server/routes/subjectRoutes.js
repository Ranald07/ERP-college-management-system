const express      = require("express");
const router       = express.Router();
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");
const { logAudit } = require("../utils/audit");

router.get("/", verify, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.code, s.name, s.semester, s.year, s.credits, s.marks_locked,
             s.dept_id, d.code AS dept_code, d.name AS dept_name
      FROM subjects s
      JOIN departments d ON s.dept_id = d.id
      ORDER BY d.code, s.semester, s.name
    `);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch subjects");
  }
});

router.get("/:id", verify, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, d.code AS dept_code, d.name AS dept_name
      FROM subjects s JOIN departments d ON s.dept_id = d.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!rows.length) return fail(res, "Subject not found", 404);
    return ok(res, rows[0]);
  } catch (err) {
    return fail(res, "Failed to fetch subject");
  }
});

// PATCH /api/subjects/:id/lock — Admin toggles marks_locked
router.patch("/:id/lock", verify, requireAdmin, async (req, res) => {
  try {
    const { locked } = req.body;
    if (typeof locked !== "boolean") return fail(res, "locked must be boolean", 400);
    await db.execute("UPDATE subjects SET marks_locked = ? WHERE id = ?", [locked ? 1 : 0, req.params.id]);
    await logAudit({ performed_by: req.user.userId, action: "lock_subject",
      entity_type: "Subject", entity_id: Number(req.params.id),
      new_value: { marks_locked: locked } });
    return ok(res, null, `Subject ${locked ? "locked" : "unlocked"}`);
  } catch (err) {
    return fail(res, "Failed to update lock");
  }
});

module.exports = router;
