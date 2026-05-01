const express        = require("express");
const router         = express.Router();
const ctrl           = require("../controllers/marksController");
const verify         = require("../middleware/verifyToken");
const requireTeacher = require("../middleware/requireTeacher");
const requireSelf    = require("../middleware/requireSelf");

router.post("/bulk",       verify, requireTeacher, ctrl.saveBulkMarks);
router.get("/:studentId",  verify, requireSelf,    ctrl.getMarksByStudent);

module.exports = router;
