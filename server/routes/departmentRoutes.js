const express      = require("express");
const router       = express.Router();
const verify       = require("../middleware/verifyToken");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

router.get("/", verify, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM departments ORDER BY code");
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch departments");
  }
});

module.exports = router;
