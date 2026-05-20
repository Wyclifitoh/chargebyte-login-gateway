const jwt = require("jsonwebtoken");
const db = require("../config/database");

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      `SELECT u.id, u.full_name as name, u.email, u.is_active, u.role 
       FROM system_users u   
       WHERE u.id = ? AND u.is_active = 1`,
      [decoded.userId],
    );

    if (!users.length) {
      return res
        .status(401)
        .json({ success: false, error: "User not found or inactive" });
    }

    req.user = {
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    return res
      .status(500)
      .json({ success: false, error: "Authentication failed" });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, error: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
