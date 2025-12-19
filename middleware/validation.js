const mongoose = require("mongoose");
const { ValidationError } = require("../utils/AppError");

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }

    next();
  };
};

// Validate multiple ObjectIds
const validateObjectIds = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError(`Invalid ${paramName} format`);
      }
    }

    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);

  if (page && (isNaN(page) || page < 1)) {
    throw new ValidationError("Page must be a positive number");
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    throw new ValidationError("Limit must be between 1 and 100");
  }

  // Set defaults
  req.query.page = page || 1;
  req.query.limit = limit || 20;

  next();
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate username
const validateUsername = (username) => {
  // 3-25 chars, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,25}$/;
  return usernameRegex.test(username);
};

// Validate URL
const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validate date range
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && isNaN(Date.parse(startDate))) {
    throw new ValidationError("Invalid start date format");
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    throw new ValidationError("Invalid end date format");
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new ValidationError("Start date must be before end date");
    }

    // Max range 1 year
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      throw new ValidationError("Date range cannot exceed 1 year");
    }
  }

  next();
};

// Validate file upload
const validateFileUpload = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      if (file.size > maxSize) {
        throw new ValidationError(
          `File ${file.originalname} exceeds maximum size of ${maxSize / 1024 / 1024}MB`
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(
          `File type ${file.mimetype} is not allowed`
        );
      }
    }

    next();
  };
};

// Validate search query
const validateSearch = (req, res, next) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ValidationError("Search query must be at least 2 characters");
  }

  if (query.length > 100) {
    throw new ValidationError("Search query too long (max 100 characters)");
  }

  // Sanitize query
  req.query.query = query.trim();

  next();
};

// Validate content length
const validateContentLength = (field, minLength, maxLength) => {
  return (req, res, next) => {
    const content = req.body[field];

    if (!content || typeof content !== 'string') {
      return next();
    }

    const length = content.trim().length;

    if (minLength && length < minLength) {
      throw new ValidationError(
        `${field} must be at least ${minLength} characters`
      );
    }

    if (maxLength && length > maxLength) {
      throw new ValidationError(
        `${field} must not exceed ${maxLength} characters`
      );
    }

    next();
  };
};

// Validate array length
const validateArrayLength = (field, minLength, maxLength) => {
  return (req, res, next) => {
    const array = req.body[field];

    if (!Array.isArray(array)) {
      return next();
    }

    if (minLength && array.length < minLength) {
      throw new ValidationError(
        `${field} must have at least ${minLength} items`
      );
    }

    if (maxLength && array.length > maxLength) {
      throw new ValidationError(
        `${field} must not exceed ${maxLength} items`
      );
    }

    next();
  };
};

// Sanitize input
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// Rate limit by user
const rateLimitByUser = (maxRequests, windowMs) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();

    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      throw new ValidationError(
        `Too many requests. Please wait ${Math.ceil(windowMs / 1000)} seconds.`
      );
    }

    validRequests.push(now);
    userRequests.set(userId, validRequests);

    next();
  };
};

// Validate enum value
const validateEnum = (field, allowedValues) => {
  return (req, res, next) => {
    const value = req.body[field] || req.query[field];

    if (!value) {
      return next();
    }

    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `Invalid ${field}. Allowed values: ${allowedValues.join(', ')}`
      );
    }

    next();
  };
};

// Validate required fields
const validateRequiredFields = (...fields) => {
  return (req, res, next) => {
    const missing = [];

    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`
      );
    }

    next();
  };
};

// Validate numeric range
const validateNumericRange = (field, min, max) => {
  return (req, res, next) => {
    const value = parseInt(req.body[field] || req.query[field]);

    if (isNaN(value)) {
      return next();
    }

    if (min !== undefined && value < min) {
      throw new ValidationError(
        `${field} must be at least ${min}`
      );
    }

    if (max !== undefined && value > max) {
      throw new ValidationError(
        `${field} must not exceed ${max}`
      );
    }

    next();
  };
};

// Validate coordinates
const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined && longitude === undefined) {
    return next();
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new ValidationError("Invalid latitude (must be between -90 and 90)");
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new ValidationError("Invalid longitude (must be between -180 and 180)");
  }

  next();
};

// Validate phone number
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

// Validate hex color
const validateHexColor = (color) => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// Check if array contains duplicates
const hasDuplicates = (array) => {
  return new Set(array).size !== array.length;
};

// Validate no duplicate values in array field
const validateNoDuplicates = (field) => {
  return (req, res, next) => {
    const array = req.body[field];

    if (!Array.isArray(array)) {
      return next();
    }

    if (hasDuplicates(array)) {
      throw new ValidationError(
        `${field} contains duplicate values`
      );
    }

    next();
  };
};

const validateBoolean = (field) => {
  return (req, res, next) => {
    const value = req.body[field];

    if (value === undefined) {
      return next();
    }

    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      throw new ValidationError(
        `${field} must be a boolean value`
      );
    }

    if (typeof value === 'string') {
      req.body[field] = value === 'true';
    }

    next();
  };
};

module.exports = {
  validateObjectId,
  validateObjectIds,
  validatePagination,
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
  validateDateRange,
  validateFileUpload,
  validateSearch,
  validateContentLength,
  validateArrayLength,
  sanitizeInput,
  rateLimitByUser,
  validateEnum,
  validateRequiredFields,
  validateNumericRange,
  validateCoordinates,
  validatePhoneNumber,
  validateHexColor,
  hasDuplicates,
  validateNoDuplicates,
  validateBoolean
};