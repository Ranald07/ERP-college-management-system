const express      = require("express");
const router       = express.Router();
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

// POST /api/announcements — Admin creates
router.post("/", verify, requireAdmin, async (req, res) => {
  try {
    const { title, body, target_role = "all", target_dept_id = null } = req.body;
    if (!title || !body) return fail(res, "Title and body required", 400);
    const [r] = await db.execute(
      "INSERT INTO announcements (created_by, title, body, target_role, target_dept_id) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, title, body, target_role, target_dept_id || null]
    );
    return ok(res, { id: r.insertId }, "Announcement created", 201);
  } catch (err) {
    return fail(res, "Failed to create announcement");
  }
});

// GET /api/announcements — Relevant to user
router.get("/", verify, async (req, res) => {
  try {
    // Get user's dept_id if student or teacher
    let deptId = null;
    if (req.user.role === "student") {
      const [r] = await db.execute("SELECT dept_id FROM students WHERE id = ?", [req.user.roleId]);
      deptId = r[0]?.dept_id || null;
    } else if (req.user.role === "teacher") {
      const [r] = await db.execute("SELECT dept_id FROM teachers WHERE id = ?", [req.user.roleId]);
      deptId = r[0]?.dept_id || null;
    }

    const [rows] = await db.execute(`
      SELECT a.*,
             u.name AS created_by_name,
             (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = ?) AS is_read
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE a.is_active = 1
        AND (a.target_role = 'all' OR a.target_role = ?)
        AND (a.target_dept_id IS NULL OR a.target_dept_id = ?)
      ORDER BY a.created_at DESC
    `, [req.user.userId, req.user.role, deptId]);

    return ok(res, rows.map(r => ({ ...r, is_read: r.is_read > 0 })));
  } catch (err) {
    return fail(res, "Failed to fetch announcements");
  }
});

// GET /api/announcements/unread-count
router.get("/unread-count", verify, async (req, res) => {
  try {
    let deptId = null;
    if (req.user.role === "student") {
      const [r] = await db.execute("SELECT dept_id FROM students WHERE id = ?", [req.user.roleId]);
      deptId = r[0]?.dept_id || null;
    } else if (req.user.role === "teacher") {
      const [r] = await db.execute("SELECT dept_id FROM teachers WHERE id = ?", [req.user.roleId]);
      deptId = r[0]?.dept_id || null;
    }

    const [[{ count }]] = await db.execute(`
      SELECT COUNT(*) AS count FROM announcements a
      WHERE a.is_active = 1
        AND (a.target_role = 'all' OR a.target_role = ?)
        AND (a.target_dept_id IS NULL OR a.target_dept_id = ?)
        AND a.id NOT IN (SELECT announcement_id FROM announcement_reads WHERE user_id = ?)
    `, [req.user.role, deptId, req.user.userId]);

    return ok(res, { count: Number(count) });
  } catch (err) {
    return fail(res, "Failed to get unread count");
  }
});

// PATCH /api/announcements/:id/read
router.patch("/:id/read", verify, async (req, res) => {
  try {
    await db.execute(
      "INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)",
      [req.params.id, req.user.userId]
    );
    return ok(res, null, "Marked as read");
  } catch (err) {
    return fail(res, "Failed to mark read");
  }
});

module.exports = router;
