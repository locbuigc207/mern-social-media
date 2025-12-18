const Joi = require('joi');

const postSchemas = {
  create: Joi.object({
    content: Joi.string().max(5000).allow('').optional(),
    status: Joi.string().valid('published', 'draft', 'scheduled').default('published'),
    scheduledDate: Joi.date().greater('now').when('status', {
      is: 'scheduled',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    isDraft: Joi.boolean().default(false)
  }),

  update: Joi.object({
    content: Joi.string().max(5000).optional(),
    existingImages: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().required(),
        type: Joi.string().required(),
        width: Joi.number().optional(),
        height: Joi.number().optional()
      })
    ).max(10).optional()
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
        'scam',
        'copyright',
        'self_harm',
        'terrorism',
        'child_exploitation',
        'other'
      )
      .required(),
    description: Joi.string().min(10).max(500).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
  }),

  hide: Joi.object({
    reason: Joi.string().max(200).optional()
  }),

  schedule: Joi.object({
    content: Joi.string().max(5000).allow('').optional(),
    images: Joi.array().min(1).required(),
    scheduledDate: Joi.date().greater('now').required()
  })
};

module.exports = postSchemas;