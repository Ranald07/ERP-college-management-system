const express        = require("express");
const router         = express.Router();
const ctrl           = require("../controllers/teacherController");
const verify         = require("../middleware/verifyToken");
const requireAdmin   = require("../middleware/requireAdmin");
const requireTeacher = require("../middleware/requireTeacher");

router.get("/",                              verify, requireAdmin,   ctrl.getAllTeachers);
router.post("/",                             verify, requireAdmin,   ctrl.createTeacher);
router.get("/my-subjects",                   verify, requireTeacher, ctrl.getMySubjects);
router.get("/subject/:subjectId/students",   verify, requireTeacher, ctrl.getStudentsForSubject);
router.get("/:id",                           verify, requireAdmin,   ctrl.getTeacherById);
router.put("/:id",                           verify, requireAdmin,   ctrl.updateTeacher);
router.delete("/:id",                        verify, requireAdmin,   ctrl.deleteTeacher);
router.put("/:id/subjects",                  verify, requireAdmin,   ctrl.updateSubjectAssignments);

module.exports = router;
