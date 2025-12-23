const Users = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { AuthenticationError, AuthorizationError } = require('../utils/AppError');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      throw new AuthenticationError("Authentication required. Please login.");
    }

    token = token.trim();
    
    if (token.startsWith("Bearer ")) {
      token = token.substring(7).trim();
    }
    
    if (!token || token.length < 20) {
      throw new AuthenticationError("Invalid token format.");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded || !decoded.id) {
      throw new AuthenticationError("Invalid authentication token.");
    }

    const user = await Users.findOne({ _id: decoded.id }).select("-password");

    if (!user) {
      throw new AuthenticationError("User not found. Please login again.");
    }

    await user.checkAndUnblockIfExpired();
    
    const blockStatus = user.getBlockStatus();
    
    if (blockStatus.isBlocked) {
      logger.warn('Blocked user attempted access', {
        userId: user._id,
        username: user.username,
        blockType: blockStatus.type,
        reason: blockStatus.reason,
      });
      
      let errorMessage;
      
      switch (blockStatus.type) {
        case "permanent_ban":
          errorMessage = `Your account has been permanently banned. Reason: ${blockStatus.reason}. Contact support if you believe this is an error.`;
          break;
          
        case "temporary_suspension":
          const hoursRemaining = Math.ceil(
            (blockStatus.expiresAt - new Date()) / (1000 * 60 * 60)
          );
          errorMessage = `Your account is suspended for ${hoursRemaining} more hours. Reason: ${blockStatus.reason}.`;
          break;
          
        case "admin_block":
          errorMessage = `Your account has been blocked. Reason: ${blockStatus.reason}. Please contact support.`;
          break;
          
        default:
          errorMessage = user.blockedReason || "Your account has been blocked. Please contact support.";
      }
      
      return res.status(403).json({
        msg: errorMessage,
        blockStatus: {
          isBlocked: true,
          type: blockStatus.type,
          blockedAt: blockStatus.blockedAt,
          expiresAt: blockStatus.expiresAt,
          canAppeal: blockStatus.canAppeal,
        }
      });
    }

    if (user.tokenVersion !== undefined && decoded.version !== user.tokenVersion) {
      logger.warn('Invalid token version', {
        userId: user._id,
        tokenVersion: decoded.version,
        currentVersion: user.tokenVersion,
      });
      throw new AuthenticationError("Your session has been invalidated. Please login again.");
    }

    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      throw new AuthorizationError("Please verify your email before accessing this resource.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AuthenticationError("Invalid token. Please login again."));
    }
    
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationError("Token expired. Please login again."));
    }

    next(err);
  }
};

const checkAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required.");
    }

    const blockStatus = req.user.getBlockStatus();
    if (blockStatus.isBlocked) {
      logger.warn('Blocked admin attempted access', {
        adminId: req.user._id,
        username: req.user.username,
        blockType: blockStatus.type,
      });
      throw new AuthorizationError("Admin account is blocked.");
    }

    if (req.user.role !== 'admin') {
      logger.warn('Non-admin attempted admin access', {
        userId: req.user._id,
        username: req.user.username
      });
      throw new AuthorizationError("Admin access required.");
    }

    logger.info('Admin access granted', {
      adminId: req.user._id,
      username: req.user.username
    });

    next();
  } catch (err) {
    next(err);
  }
};

const checkModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required.");
    }

    const blockStatus = req.user.getBlockStatus();
    if (blockStatus.isBlocked) {
      throw new AuthorizationError("Your account is blocked.");
    }

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      logger.warn('Non-moderator attempted moderator access', {
        userId: req.user._id,
        username: req.user.username
      });
      throw new AuthorizationError("Moderator or admin access required.");
    }

    next();
  } catch (err) {
    next(err);
  }
};

const checkOwnerOrAdmin = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        const { NotFoundError } = require('../utils/AppError');
        throw new NotFoundError(resourceModel.modelName);
      }

      const isOwner = resource.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new AuthorizationError("You don't have permission to access this resource.");
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};

const checkEmailVerified = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      throw new AuthorizationError(
        "Please verify your email address to access this feature."
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return next();
    }

    token = token.trim();
    if (token.startsWith("Bearer ")) {
      token = token.substring(7).trim();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decoded && decoded.id) {
      const user = await Users.findOne({ _id: decoded.id }).select("-password");
      
      if (user) {
        await user.checkAndUnblockIfExpired();
        
        const blockStatus = user.getBlockStatus();
        if (!blockStatus.isBlocked) {
          req.user = user;
        }
      }
    }

    next();
  } catch (err) {
    next();
  }
};

const refreshTokenIfNeeded = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return next();
    }

    token = token.trim();
    if (token.startsWith("Bearer ")) {
      token = token.substring(7).trim();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      ignoreExpiration: true
    });

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn < 300 && expiresIn > 0) {
      const user = await Users.findById(decoded.id);
      
      if (user && !user.getBlockStatus().isBlocked) {
        const newToken = jwt.sign(
          { id: decoded.id, version: user.tokenVersion || 0 },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '1d' }
        );

        res.setHeader('X-New-Token', newToken);
        
        logger.info('Token refreshed', {
          userId: decoded.id
        });
      }
    }

    next();
  } catch (err) {
    next();
  }
};

module.exports = {
  auth,
  checkAdmin,
  checkModerator,
  checkOwnerOrAdmin,
  checkEmailVerified,
  optionalAuth,
  refreshTokenIfNeeded
};