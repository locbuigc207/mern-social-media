const Joi = require('joi');

const commentSchemas = {
  create: Joi.object({
    postId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
      .messages({
        'string.pattern.base': 'Invalid post ID format'
      }),
    content: Joi.string().min(1).max(2000).required(),
    tag: Joi.object().optional(),
    reply: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
      .messages({
        'string.pattern.base': 'Invalid comment ID format'
      }),
    postUserId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
  }),

  update: Joi.object({
    content: Joi.string().min(1).max(2000).required()
  }),

  report: Joi.object({
    reason: Joi.string()
      .valid(
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'nudity',
        'false_information',
        'bullying',
        'threats',
        'self_harm',
        'other'
      )
      .required(),
    description: Joi.string().min(10).max(500).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
  })
};

module.exports = commentSchemas;