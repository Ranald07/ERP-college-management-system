require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const app     = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Reference data ─────────────────────────────────────────
app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/departments",   require("./routes/departmentRoutes"));
app.use("/api/subjects",      require("./routes/subjectRoutes"));

// ── Students ───────────────────────────────────────────────
// Import must be registered before the generic studentRoutes
// because /import is a specific path that would otherwise match /:id
app.use("/api/students",      require("./routes/importRoutes"));
app.use("/api/students",      require("./routes/studentRoutes"));
// Advisor assignment: PUT /api/students/:id/advisor
app.use("/api/students",      require("./routes/advisorRoutes"));

// ── Teachers ───────────────────────────────────────────────
app.use("/api/teachers",      require("./routes/teacherRoutes"));
// Advisor advisees: GET /api/teachers/my-advisees
app.use("/api/teachers",      require("./routes/advisorRoutes"));

// ── Core modules ───────────────────────────────────────────
app.use("/api/marks",         require("./routes/marksRoutes"));
app.use("/api/achievements",  require("./routes/achievementRoutes"));
app.use("/api/stats",         require("./routes/statsRoutes"));

// ── Extended modules ───────────────────────────────────────
app.use("/api/leaves",        require("./routes/leaveRoutes"));
app.use("/api/queries",       require("./routes/queryRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/audit",         require("./routes/auditRoutes"));
app.use("/api/export",        require("./routes/exportRoutes"));

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, data: null, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://0.0.0.0:${PORT}`)
);
