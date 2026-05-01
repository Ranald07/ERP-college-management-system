const express      = require("express");
const router       = express.Router();
const ctrl         = require("../controllers/achievementController");
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const requireSelf  = require("../middleware/requireSelf");

router.get("/:studentId", verify, requireSelf,  ctrl.getAchievements);
router.post("/",          verify, requireAdmin, ctrl.addAchievement);

module.exports = router;
