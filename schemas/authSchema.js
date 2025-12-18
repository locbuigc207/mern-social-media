const Joi = require('joi');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

const authSchemas = {
  register: Joi.object({
    fullname: Joi.string().min(2).max(25).required(),
    username: Joi.string().min(3).max(25).alphanum().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(passwordRegex).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    gender: Joi.string().valid('male', 'female', 'other').default('male')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(8).pattern(passwordRegex).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords do not match'
      })
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(passwordRegex).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    cnfNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords do not match'
      })
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required()
  }),

  resendVerification: Joi.object({
    email: Joi.string().email().required()
  })
};

module.exports = authSchemas;