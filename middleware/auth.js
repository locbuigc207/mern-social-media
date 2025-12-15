const Users = require('../models/userModel');
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(401).json({ msg: "You are not authorized" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded) {
      return res.status(401).json({ msg: "You are not authorized" });
    }

    const user = await Users.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isBlocked && user.role !== 'admin') {
      return res.status(403).json({ 
        msg: "Your account has been blocked",
        reason: user.blockedReason,
        blockedAt: user.blockedAt,
        isBlocked: true
      });
    }

    const publicRoutes = ['/api/verify-email', '/api/resend-verification', '/api/logout'];
    if (!user.isVerified && user.role === 'user' && !publicRoutes.includes(req.path)) {
      return res.status(403).json({ 
        msg: "Please verify your email first",
        requireVerification: true
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: "Token expired. Please login again." });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: "Invalid token. Please login again." });
    }
    return res.status(500).json({ msg: err.message });
  }
};

module.exports = auth;