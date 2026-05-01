const express      = require("express");
const router       = express.Router();
const ctrl         = require("../controllers/studentController");
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const requireSelf  = require("../middleware/requireSelf");

router.get("/",    verify, requireAdmin, ctrl.getAllStudents);
router.post("/",   verify, requireAdmin, ctrl.createStudent);
router.get("/:id", verify, requireSelf,  ctrl.getStudentById);
router.put("/:id", verify, requireAdmin, ctrl.updateStudent);

module.exports = router;
