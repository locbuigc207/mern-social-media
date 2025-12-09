const validator = require('validator');

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

// Validate and sanitize request body
const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Required check
      if (rules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip if not required and no value
      if (!rules.required && !value) continue;

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be ${rules.type}`);
        continue;
      }

      // String validations
      if (typeof value === 'string') {
        // Min length
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        // Max length
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be less than ${rules.maxLength} characters`);
        }

        // Pattern
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        // Sanitize
        if (rules.sanitize !== false) {
          req.body[field] = sanitizeInput(value);
        }
      }

      // Array validations
      if (Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push(`${field} must have at least ${rules.minItems} items`);
        }

        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push(`${field} must have less than ${rules.maxItems} items`);
        }
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        msg: 'Validation failed', 
        errors 
      });
    }

    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Validate page
  if (page < 1) {
    return res.status(400).json({ msg: 'Page must be greater than 0' });
  }

  // Validate and limit the limit
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ msg: 'Limit must be between 1 and 100' });
  }

  req.query.page = page;
  req.query.limit = limit;

  next();
};

// Validate file upload
const validateFileUpload = (maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    const { media } = req.body;

    if (!media) {
      return next();
    }

    // Validate media object
    if (!media.url || !media.type) {
      return res.status(400).json({ 
        msg: 'Invalid media format' 
      });
    }

    // Validate media type
    const allowedTypes = ['image', 'video', 'audio', 'file'];
    if (!allowedTypes.includes(media.type)) {
      return res.status(400).json({ 
        msg: 'Invalid media type' 
      });
    }

    // Validate size if provided
    if (media.size && media.size > maxSize) {
      return res.status(400).json({ 
        msg: `File size must be less than ${maxSize / (1024 * 1024)}MB` 
      });
    }

    // Validate URL
    if (!validator.isURL(media.url)) {
      return res.status(400).json({ 
        msg: 'Invalid media URL' 
      });
    }

    next();
  };
};

// Rate limiting by user
const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user._id.toString();
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      time => now - time < windowMs
    );

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({ 
        msg: 'Too many requests, please try again later' 
      });
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [key, value] of requests.entries()) {
        if (value.length === 0 || now - value[value.length - 1] > windowMs) {
          requests.delete(key);
        }
      }
    }

    next();
  };
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        msg: `Invalid ${paramName}` 
      });
    }

    next();
  };
};

module.exports = {
  validateBody,
  validatePagination,
  validateFileUpload,
  rateLimitByUser,
  validateObjectId,
  sanitizeInput
};