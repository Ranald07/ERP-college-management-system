const requireSelf = (req, res, next) => {
  if (req.user.role === "admin") return next();
  const requestedId = parseInt(req.params.studentId || req.params.id);
  if (parseInt(req.user.roleId) !== requestedId)
    return res.status(403).json({ success: false, data: null, message: "Access denied" });
  next();
};
module.exports = requireSelf;
