const express      = require("express");
const router       = express.Router();
const ctrl         = require("../controllers/statsController");
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const requireSelf  = require("../middleware/requireSelf");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

router.get("/admin",       verify, requireAdmin, ctrl.getAdminStats);
router.get("/student/:id", verify, requireSelf,  ctrl.getStudentStats);

// GET /api/stats/subject-analysis
router.get("/subject-analysis", verify, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id AS subject_id, s.code, s.name, d.code AS dept_code, s.semester, s.year,
             COUNT(m.id) AS enrolled,
             ROUND(AVG(m.total), 2) AS avg_total,
             SUM(CASE WHEN m.total >= 40 THEN 1 ELSE 0 END) AS pass_count,
             SUM(CASE WHEN m.total < 40 THEN 1 ELSE 0 END) AS fail_count,
             ROUND(SUM(CASE WHEN m.total >= 40 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(m.id),0), 1) AS pass_pct
      FROM subjects s
      JOIN departments d ON s.dept_id = d.id
      LEFT JOIN marks m ON m.subject_id = s.id
      GROUP BY s.id, s.code, s.name, d.code, s.semester, s.year
      ORDER BY d.code, s.semester
    `);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to compute subject analysis");
  }
});

// GET /api/stats/teacher-performance
router.get("/teacher-performance", verify, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id AS teacher_id, u.name, t.employee_id, d.code AS dept_code,
             COUNT(DISTINCT ts.subject_id) AS subjects_taught,
             COUNT(DISTINCT m.student_id) AS total_students,
             ROUND(AVG(
               (SELECT SUM(CASE WHEN m2.total >= 40 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(m2.id),0)
                FROM marks m2 WHERE m2.subject_id = ts.subject_id)
             ), 1) AS avg_pass_pct
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN departments d ON t.dept_id = d.id
      LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
      LEFT JOIN marks m ON m.teacher_id = t.id
      GROUP BY t.id, u.name, t.employee_id, d.code
      ORDER BY avg_pass_pct DESC
    `);
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to compute teacher performance");
  }
});

// GET /api/stats/student/:id/rank
router.get("/student/:id/rank", verify, requireSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const [stuRows] = await db.execute("SELECT dept_id, year FROM students WHERE id = ?", [id]);
    if (!stuRows.length) return fail(res, "Student not found", 404);
    const { dept_id, year } = stuRows[0];

    const [rankRows] = await db.execute(`
      SELECT s.id, ROUND(AVG(m.total), 2) AS avg_marks
      FROM students s
      LEFT JOIN marks m ON m.student_id = s.id
      WHERE s.dept_id = ? AND s.year = ?
      GROUP BY s.id
      ORDER BY avg_marks DESC
    `, [dept_id, year]);

    const total = rankRows.length;
    const rank  = rankRows.findIndex(r => r.id === Number(id)) + 1;
    const mine  = rankRows.find(r => r.id === Number(id));

    const [deptRow] = await db.execute("SELECT code FROM departments WHERE id = ?", [dept_id]);

    return ok(res, {
      rank, total_in_dept_year: total,
      avg_marks: mine?.avg_marks || 0,
      dept_code: deptRow[0]?.code, year,
    });
  } catch (err) {
    return fail(res, "Failed to compute rank");
  }
});

module.exports = router;
