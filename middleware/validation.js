const validator = require('validator');

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (!rules.required && (value === undefined || value === null)) continue;

      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
          continue;
        }
      }

      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be less than ${rules.maxLength} characters`);
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        if (rules.isEmail && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }

        if (rules.isURL && !validator.isURL(value)) {
          errors.push(`${field} must be a valid URL`);
        }

        if (rules.sanitize !== false) {
          req.body[field] = sanitizeInput(value);
        }
      }

      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      if (Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push(`${field} must have at least ${rules.minItems} items`);
        }

        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push(`${field} must have at most ${rules.maxItems} items`);
        }

        if (rules.itemType) {
          const invalidItems = value.filter(item => typeof item !== rules.itemType);
          if (invalidItems.length > 0) {
            errors.push(`All items in ${field} must be ${rules.itemType}`);
          }
        }
      }

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

const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1) {
    return res.status(400).json({ msg: 'Page must be greater than 0' });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ msg: 'Limit must be between 1 and 100' });
  }

  req.query.page = page;
  req.query.limit = limit;

  next();
};

const validateFileUpload = (maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    const { media } = req.body;

    if (!media) {
      return next();
    }

    if (!media.url || !media.type) {
      return res.status(400).json({ 
        msg: 'Invalid media format' 
      });
    }

    const allowedTypes = ['image', 'video', 'audio', 'file'];
    if (!allowedTypes.includes(media.type)) {
      return res.status(400).json({ 
        msg: 'Invalid media type' 
      });
    }

    if (media.size && media.size > maxSize) {
      return res.status(400).json({ 
        msg: `File size must be less than ${maxSize / (1024 * 1024)}MB` 
      });
    }

    if (!validator.isURL(media.url)) {
      return res.status(400).json({ 
        msg: 'Invalid media URL' 
      });
    }

    next();
  };
};

const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user._id.toString();
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
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