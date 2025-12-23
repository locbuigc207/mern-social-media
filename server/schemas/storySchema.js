const Joi = require('joi');

const storySchemas = {
  create: Joi.object({
    media: Joi.object({
      url: Joi.string().uri().required(),
      public_id: Joi.string().optional(),
      type: Joi.string().valid('image', 'video').required(),
      duration: Joi.number().optional(),
      thumbnail: Joi.string().uri().optional()
    }).required(),
    caption: Joi.string().max(500).optional().allow(''),
    privacy: Joi.string()
      .valid('public', 'friends', 'close_friends', 'custom')
      .default('public'),
    allowedViewers: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .optional()
  }),

  reply: Joi.object({
    text: Joi.string().min(1).max(500).required()
  }),

  highlight: Joi.object({
    highlightName: Joi.string().max(50).optional().default('Highlights')
  })
};

module.exports = storySchemas;