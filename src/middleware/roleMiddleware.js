module.exports = (requiredRole) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  if (req.user.role !== requiredRole) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};
