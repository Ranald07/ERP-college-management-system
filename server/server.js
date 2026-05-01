require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const app     = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── One-time setup route (remove after first use) ─────────
app.get("/api/setup", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).send("Forbidden");
  try {
    const { execSync } = require("child_process");
    execSync("node server/migrate.js", { stdio: "inherit" });
    execSync("node server/seed.js",    { stdio: "inherit" });
    res.send("Setup complete! Remove SETUP_SECRET variable now.");
  } catch (e) {
    res.status(500).send("Setup failed: " + e.message);
  }
});

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/departments",   require("./routes/departmentRoutes"));
app.use("/api/subjects",      require("./routes/subjectRoutes"));
app.use("/api/students",      require("./routes/importRoutes"));
app.use("/api/students",      require("./routes/studentRoutes"));
app.use("/api/students",      require("./routes/advisorRoutes"));
app.use("/api/teachers",      require("./routes/teacherRoutes"));
app.use("/api/teachers",      require("./routes/advisorRoutes"));
app.use("/api/marks",         require("./routes/marksRoutes"));
app.use("/api/achievements",  require("./routes/achievementRoutes"));
app.use("/api/stats",         require("./routes/statsRoutes"));
app.use("/api/leaves",        require("./routes/leaveRoutes"));
app.use("/api/queries",       require("./routes/queryRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/audit",         require("./routes/auditRoutes"));
app.use("/api/export",        require("./routes/exportRoutes"));

// ── Serve React build in production ───────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, data: null, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
