const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const db         = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return fail(res, "Email and password required", 400);

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return fail(res, "Invalid credentials", 401);

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, "Invalid credentials", 401);

    let roleId = null;
    if (user.role === "student") {
      const [r] = await db.execute("SELECT id FROM students WHERE user_id = ?", [user.id]);
      roleId = r[0]?.id ?? null;
    } else if (user.role === "teacher") {
      const [r] = await db.execute("SELECT id FROM teachers WHERE user_id = ?", [user.id]);
      roleId = r[0]?.id ?? null;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, roleId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return ok(res, { token, role: user.role, userId: user.id, roleId, name: user.name });
  } catch (err) {
    console.error("Login error:", err);
    return fail(res, "Server error during login");
  }
};
