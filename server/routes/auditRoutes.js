const express      = require("express");
const router       = express.Router();
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

router.get("/", verify, requireAdmin, async (req, res) => {
  try {
    const { entity_type, performed_by, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT al.*, u.name AS performer_name
      FROM audit_logs al
      JOIN users u ON al.performed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (entity_type) { sql += " AND al.entity_type = ?"; params.push(entity_type); }
    if (performed_by) { sql += " AND al.performed_by = ?"; params.push(performed_by); }
    sql += " ORDER BY al.performed_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [rows] = await db.execute(sql, params);
    const [[{ total }]] = await db.execute("SELECT COUNT(*) AS total FROM audit_logs");
    return ok(res, { rows, total: Number(total) });
  } catch (err) {
    return fail(res, "Failed to fetch audit logs");
  }
});

module.exports = router;
