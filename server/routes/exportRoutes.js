const express      = require("express");
const router       = express.Router();
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const db           = require("../config/db");
const { fail }     = require("../utils/response");
const { logAudit } = require("../utils/audit");
const ExcelJS      = require("exceljs");

const styleHeader = (ws) => {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
};

const autoWidth = (ws) => {
  ws.columns.forEach(col => {
    let max = col.header ? col.header.length : 10;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 4, 40);
  });
};

const shadeRows = (ws) => {
  ws.eachRow((row, i) => {
    if (i > 1 && i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }
  });
};

// GET /api/export/students
router.get("/students", verify, requireAdmin, async (req, res) => {
  try {
    const { dept, year, search } = req.query;
    let sql = `
      SELECT s.reg_no, u.name, d.name AS department, s.year, s.gender,
             s.accommodation_type, s.phone, u.email
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.dept_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (dept)   { sql += " AND d.code = ?"; params.push(dept); }
    if (year)   { sql += " AND s.year = ?"; params.push(year); }
    if (search) { sql += " AND (u.name LIKE ? OR s.reg_no LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY u.name";

    const [rows] = await db.execute(sql, params);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Students");
    ws.columns = [
      { header: "Reg No",        key: "reg_no" },
      { header: "Name",          key: "name" },
      { header: "Department",    key: "department" },
      { header: "Year",          key: "year" },
      { header: "Gender",        key: "gender" },
      { header: "Accommodation", key: "accommodation_type" },
      { header: "Phone",         key: "phone" },
      { header: "Email",         key: "email" },
    ];
    rows.forEach(r => ws.addRow(r));
    styleHeader(ws); autoWidth(ws); shadeRows(ws);

    const date = new Date().toISOString().slice(0,10);
    const filename = `apr_students_${dept||"all"}_${year||"all"}_${date}.xlsx`;

    const [log] = await db.execute(
      "INSERT INTO export_logs (performed_by, export_type, filters) VALUES (?, 'StudentList', ?)",
      [req.user.userId, JSON.stringify({ dept, year, search })]
    );
    await logAudit({ performed_by: req.user.userId, action: "export",
      entity_type: "Export", entity_id: log.insertId,
      new_value: { export_type: "StudentList", filters: { dept, year, search } } });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    return fail(res, "Export failed");
  }
});

// GET /api/export/marks/:subjectId
router.get("/marks/:subjectId", verify, requireAdmin, async (req, res) => {
  try {
    const [subRows] = await db.execute("SELECT * FROM subjects WHERE id = ?", [req.params.subjectId]);
    if (!subRows.length) return fail(res, "Subject not found", 404);
    const sub = subRows[0];

    const [rows] = await db.execute(`
      SELECT s.reg_no, u.name,
             m.internal1, m.internal2, m.internal3,
             m.internal_converted, m.\`external\`, m.total
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE m.subject_id = ?
      ORDER BY u.name
    `, [req.params.subjectId]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Marks");
    ws.columns = [
      { header: "Reg No",          key: "reg_no" },
      { header: "Name",            key: "name" },
      { header: "Internal 1 (/50)",key: "internal1" },
      { header: "Internal 2 (/50)",key: "internal2" },
      { header: "Internal 3 (/50)",key: "internal3" },
      { header: "Converted (/40)", key: "internal_converted" },
      { header: "External (/60)",  key: "external" },
      { header: "Total (/100)",    key: "total" },
      { header: "Pass/Fail",       key: "result" },
    ];
    rows.forEach(r => ws.addRow({ ...r, result: Number(r.total) >= 40 ? "Pass" : "Fail" }));
    styleHeader(ws); autoWidth(ws); shadeRows(ws);

    const date = new Date().toISOString().slice(0,10);
    const filename = `apr_marks_${sub.code}_${date}.xlsx`;

    const [log] = await db.execute(
      "INSERT INTO export_logs (performed_by, export_type, filters) VALUES (?, 'MarksReport', ?)",
      [req.user.userId, JSON.stringify({ subject_id: req.params.subjectId })]
    );
    await logAudit({ performed_by: req.user.userId, action: "export",
      entity_type: "Export", entity_id: log.insertId,
      new_value: { export_type: "MarksReport", filters: { subject_id: req.params.subjectId } } });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    return fail(res, "Export failed");
  }
});

// GET /api/export/subject-analysis
router.get("/subject-analysis", verify, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.code, s.name, d.code AS dept_code, s.semester,
             COUNT(m.id) AS enrolled,
             ROUND(AVG(m.total), 2) AS avg_total,
             ROUND(SUM(CASE WHEN m.total >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(m.id), 1) AS pass_pct
      FROM subjects s
      JOIN departments d ON s.dept_id = d.id
      LEFT JOIN marks m ON m.subject_id = s.id
      GROUP BY s.id, s.code, s.name, d.code, s.semester
      ORDER BY d.code, s.semester
    `);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Subject Analysis");
    ws.columns = [
      { header: "Subject Code", key: "code" },
      { header: "Subject Name", key: "name" },
      { header: "Department",   key: "dept_code" },
      { header: "Semester",     key: "semester" },
      { header: "Enrolled",     key: "enrolled" },
      { header: "Avg Total",    key: "avg_total" },
      { header: "Pass %",       key: "pass_pct" },
    ];
    rows.forEach(r => ws.addRow(r));
    styleHeader(ws); autoWidth(ws); shadeRows(ws);

    const date = new Date().toISOString().slice(0,10);
    const filename = `apr_subject_analysis_${date}.xlsx`;

    const [log] = await db.execute(
      "INSERT INTO export_logs (performed_by, export_type, filters) VALUES (?, 'SubjectAnalysis', NULL)",
      [req.user.userId]
    );
    await logAudit({ performed_by: req.user.userId, action: "export",
      entity_type: "Export", entity_id: log.insertId,
      new_value: { export_type: "SubjectAnalysis" } });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    return fail(res, "Export failed");
  }
});

module.exports = router;
