const db = require("../config/db");

async function logAudit({ performed_by, action, entity_type, entity_id, old_value = null, new_value = null }) {
  try {
    await db.execute(
      "INSERT INTO audit_logs (performed_by, action, entity_type, entity_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)",
      [performed_by, action, entity_type, entity_id,
       old_value ? JSON.stringify(old_value) : null,
       new_value ? JSON.stringify(new_value) : null]
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

module.exports = { logAudit };
