const requireTeacher = (req, res, next) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.status(403).json({ success: false, data: null, message: "Teacher access required" });
  next();
};
module.exports = requireTeacher;
