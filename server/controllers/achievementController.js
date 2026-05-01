const db           = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.getAchievements = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM achievements WHERE student_id = ? ORDER BY year DESC, added_at DESC",
      [req.params.studentId]
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, "Failed to fetch achievements");
  }
};

exports.addAchievement = async (req, res) => {
  try {
    const { student_id, title, description, category, year } = req.body;
    if (!student_id || !title || !year)
      return fail(res, "Missing required fields", 400);

    await db.execute(
      "INSERT INTO achievements (student_id, title, description, category, year) VALUES (?, ?, ?, ?, ?)",
      [student_id, title, description || "", category || "Other", year]
    );
    return ok(res, null, "Achievement added", 201);
  } catch (err) {
    return fail(res, "Failed to add achievement");
  }
};
