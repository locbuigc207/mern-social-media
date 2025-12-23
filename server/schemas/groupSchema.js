const Joi = require('joi');

const groupSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    avatar: Joi.string().uri().optional(),
    members: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(256)
      .required()
      .messages({
        'array.min': 'At least 1 member is required',
        'array.max': 'Maximum 256 members allowed'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional().allow(''),
    avatar: Joi.string().uri().optional()
  }),

  sendMessage: Joi.object({
    text: Joi.string().max(5000).optional().allow(''),
    media: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        type: Joi.string().valid('image', 'video', 'audio', 'file').required(),
        name: Joi.string().optional(),
        size: Joi.number().optional()
      })
    ).optional(),
    replyTo: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    mentions: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .optional()
  }).custom((value, helpers) => {
    if ((!value.text || !value.text.trim()) && (!value.media || value.media.length === 0)) {
      return helpers.error('any.invalid', { 
        message: 'Message cannot be empty - either text or media is required' 
      });
    }
    return value;
  }),

  addMembers: Joi.object({
    members: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(50)
      .required()
  }),

  updateSettings: Joi.object({
    onlyAdminsCanPost: Joi.boolean().optional(),
    onlyAdminsCanAddMembers: Joi.boolean().optional(),
    onlyAdminsCanEditInfo: Joi.boolean().optional(),
    allowMembersToLeave: Joi.boolean().optional()
  })
};

module.exports = groupSchemas;