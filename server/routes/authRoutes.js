const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const ctrl     = require("../controllers/authController");
const verify   = require("../middleware/verifyToken");
const db       = require("../config/db");
const { ok, fail } = require("../utils/response");

router.post("/login", ctrl.login);

// PUT /api/auth/change-password
router.put("/change-password", verify, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return fail(res, "Both current and new password required", 400);
    if (new_password.length < 6)
      return fail(res, "New password must be at least 6 characters", 400);

    const [rows] = await db.execute("SELECT password FROM users WHERE id = ?", [req.user.userId]);
    if (!rows.length) return fail(res, "User not found", 404);

    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return fail(res, "Current password is incorrect", 400);

    const hash = await bcrypt.hash(new_password, 10);
    await db.execute("UPDATE users SET password = ? WHERE id = ?", [hash, req.user.userId]);
    return ok(res, null, "Password changed successfully");
  } catch (err) {
    return fail(res, "Failed to change password");
  }
});

module.exports = router;
