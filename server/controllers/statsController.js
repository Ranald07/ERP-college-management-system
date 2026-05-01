const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.getAdminStats = async (req, res) => {
  try {
    const [[{ totalStudents }]] = await db.execute("SELECT COUNT(*) AS totalStudents FROM students");
    const [[{ totalTeachers }]] = await db.execute("SELECT COUNT(*) AS totalTeachers FROM teachers");

    const [deptRows] = await db.execute(`
      SELECT d.code, COUNT(s.id) AS count
      FROM departments d
      LEFT JOIN students s ON s.dept_id = d.id
      GROUP BY d.id, d.code ORDER BY d.code
    `);
    const deptCount = {};
    deptRows.forEach(r => { deptCount[r.code] = Number(r.count); });

    const [[{ hostellerCount }]] = await db.execute(
      "SELECT COUNT(*) AS hostellerCount FROM students WHERE accommodation_type = 'Hosteller'"
    );
    const dayScholarCount = totalStudents - hostellerCount;

    // overallAvg: average of all subject totals (each out of 100) → already a percentage
    const [[{ overallAvg }]] = await db.execute(
      "SELECT ROUND(AVG(total), 2) AS overallAvg FROM marks"
    );

    // Top 5 by average total across all subjects
    const [topStudents] = await db.execute(`
      SELECT s.id, s.reg_no, u.name, d.code AS dept,
             ROUND(AVG(m.total), 2) AS avg_marks
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      JOIN marks m ON m.student_id = s.id
      GROUP BY s.id, s.reg_no, u.name, d.code
      ORDER BY avg_marks DESC
      LIMIT 5
    `);

    return ok(res, {
      totalStudents, totalTeachers,
      deptCount, hostellerCount, dayScholarCount,
      overallAvg: overallAvg || 0,
      topStudents,
    });
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to compute stats");
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`
      SELECT m.semester, m.total, m.internal1, m.internal2, m.internal3, m.external,
             s.name AS subject_name, s.code AS subject_code, s.credits
      FROM marks m
      JOIN subjects s ON m.subject_id = s.id
      WHERE m.student_id = ?
      ORDER BY m.semester, s.name
    `, [id]);

    // Group by semester
    const semMap = {};
    for (const r of rows) {
      if (!semMap[r.semester]) semMap[r.semester] = { semester: r.semester, subjects: [], totalMarks: 0 };
      semMap[r.semester].subjects.push(r);
      semMap[r.semester].totalMarks += Number(r.total || 0);
    }

    const semesterData = Object.values(semMap).map(sem => {
      // avg = mean of subject totals (each /100) → already a percentage
      const avg = sem.subjects.length ? sem.totalMarks / sem.subjects.length : 0;
      return {
        semester:   sem.semester,
        subjects:   sem.subjects,
        avg:        parseFloat(avg.toFixed(2)),       // e.g. 78.50 (out of 100)
        percentage: parseFloat(avg.toFixed(2)),       // same value, already %
      };
    });

    // CGPA on 10-point scale: avg_percentage / 10
    const cgpa = semesterData.length
      ? parseFloat((semesterData.reduce((s, d) => s + d.avg, 0) / semesterData.length / 10).toFixed(2))
      : 0;

    let trend = "No data";
    if (semesterData.length >= 2) {
      const diff = semesterData.at(-1).avg - semesterData.at(-2).avg;
      trend = diff > 2 ? "Improving" : diff < -2 ? "Declining" : "Stable";
    }

    return ok(res, { semesterData, cgpa, trend });
  } catch (err) {
    return fail(res, "Failed to compute student stats");
  }
};
