const db           = require("../config/db");
const { ok, fail } = require("../utils/response");
const { logAudit } = require("../utils/audit");

// Teacher saves bulk marks for all students in a subject
exports.saveBulkMarks = async (req, res) => {
  const { subject_id, semester, marks } = req.body;

  if (!subject_id || !semester || !Array.isArray(marks) || marks.length === 0)
    return fail(res, "Missing required fields", 400);

  const teacherId = req.user.roleId;

  // Verify teacher is assigned to this subject (skip check for admin)
  if (req.user.role === "teacher") {
    const [check] = await db.execute(
      "SELECT id FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?",
      [teacherId, subject_id]
    );
    if (!check.length) return fail(res, "You are not assigned to this subject", 403);
  }

  // Check marks_locked
  const [subRows] = await db.execute("SELECT marks_locked FROM subjects WHERE id = ?", [subject_id]);
  if (subRows.length && subRows[0].marks_locked)
    return fail(res, "Marks are locked for this subject by admin.", 403);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const m of marks) {
      if (!m.student_id) continue;
      await conn.execute(
        `INSERT INTO marks
           (student_id, subject_id, teacher_id, semester, internal1, internal2, internal3, external)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           internal1  = VALUES(internal1),
           internal2  = VALUES(internal2),
           internal3  = VALUES(internal3),
           external   = VALUES(external),
           teacher_id = VALUES(teacher_id)`,
        [
          m.student_id, subject_id, teacherId || null, semester,
          Number(m.internal1) || 0,
          Number(m.internal2) || 0,
          Number(m.internal3) || 0,
          Number(m.external)  || 0,
        ]
      );
    }
    await conn.commit();
    await logAudit({ performed_by: req.user.userId, action: "bulk_marks_saved",
      entity_type: "Subject", entity_id: Number(subject_id),
      new_value: { count: marks.length } });
    return ok(res, null, "Marks saved successfully");
  } catch (err) {
    await conn.rollback();
    console.error("saveBulkMarks error:", err);
    return fail(res, "Failed to save marks: " + err.message);
  } finally {
    conn.release();
  }
};

// Get all marks for a student grouped by semester
exports.getMarksByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const [rows] = await db.execute(`
      SELECT m.id, m.semester,
             m.internal1, m.internal2, m.internal3,
             m.internal_converted, m.external, m.total,
             s.id AS subject_id, s.code AS subject_code,
             s.name AS subject_name, s.credits,
             u.name AS teacher_name
      FROM marks m
      JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN teachers t  ON m.teacher_id = t.id
      LEFT JOIN users u     ON t.user_id = u.id
      WHERE m.student_id = ?
      ORDER BY m.semester, s.name
    `, [studentId]);

    // Group by semester
    const semMap = {};
    for (const r of rows) {
      if (!semMap[r.semester])
        semMap[r.semester] = { semester: r.semester, subjects: [] };
      semMap[r.semester].subjects.push(r);
    }

    const result = Object.values(semMap).map(sem => {
      const totalMarks = sem.subjects.reduce((s, r) => s + Number(r.total || 0), 0);
      const avg        = sem.subjects.length ? totalMarks / sem.subjects.length : 0;
      return {
        semester:    sem.semester,
        subjects:    sem.subjects,
        semesterAvg: parseFloat(avg.toFixed(2)),
        percentage:  parseFloat(avg.toFixed(2)),
      };
    });

    return ok(res, result);
  } catch (err) {
    console.error("getMarksByStudent error:", err);
    return fail(res, "Failed to fetch marks");
  }
};
