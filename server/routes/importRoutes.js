const express      = require("express");
const router       = express.Router();
const multer       = require("multer");
const { parse }    = require("csv-parse");
const bcrypt       = require("bcryptjs");
const verify       = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");
const db           = require("../config/db");
const { ok, fail } = require("../utils/response");
const { logAudit } = require("../utils/audit");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/import", verify, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return fail(res, "CSV file required", 400);

  const records = await new Promise((resolve, reject) => {
    parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true },
      (err, data) => err ? reject(err) : resolve(data));
  }).catch(() => null);

  if (!records) return fail(res, "Failed to parse CSV", 400);

  const errors = [];
  let success_rows = 0;

  // Get dept map
  const [depts] = await db.execute("SELECT id, code FROM departments");
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code] = d.id; });

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed + header
    try {
      const { name, email, reg_no, dept_code, year, gender, dob, accommodation_type, room_no, phone, password } = row;
      if (!name || !email || !reg_no || !dept_code || !year || !gender || !dob || !accommodation_type)
        throw new Error("Missing required fields");
      if (!deptMap[dept_code]) throw new Error(`Unknown dept_code: ${dept_code}`);
      if (!["Male","Female","Other"].includes(gender)) throw new Error("Invalid gender");
      if (!["Hosteller","Day Scholar"].includes(accommodation_type)) throw new Error("Invalid accommodation_type");

      const hash = await bcrypt.hash(password || "student123", 10);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [uRes] = await conn.execute(
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')",
          [name, email, hash]
        );
        await conn.execute(
          `INSERT INTO students (user_id, reg_no, dept_id, year, gender, dob, accommodation_type, room_no, phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uRes.insertId, reg_no, deptMap[dept_code], Number(year), gender, dob,
           accommodation_type, room_no || null, phone || null]
        );
        await conn.commit();
        success_rows++;
      } catch (e) {
        await conn.rollback();
        throw new Error(e.code === "ER_DUP_ENTRY" ? "Duplicate email or reg_no" : e.message);
      } finally { conn.release(); }
    } catch (e) {
      errors.push({ row: rowNum, reason: e.message });
    }
  }

  const [log] = await db.execute(
    "INSERT INTO import_logs (performed_by, filename, total_rows, success_rows, failed_rows, errors) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.userId, req.file.originalname, records.length, success_rows, errors.length, JSON.stringify(errors)]
  );
  await logAudit({ performed_by: req.user.userId, action: "bulk_import",
    entity_type: "Import", entity_id: log.insertId,
    new_value: { success_rows, failed_rows: errors.length } });

  return ok(res, { total_rows: records.length, success_rows, failed_rows: errors.length, errors });
});

module.exports = router;
