const Joi = require('joi');

const reportSchemas = {
  blockUser: Joi.object({
    reason: Joi.string().min(10).max(500).required()
  }),

  acceptReport: Joi.object({
    actionTaken: Joi.string()
      .valid('none', 'warning', 'content_removed', 'account_suspended', 'account_banned')
      .required(),
    adminNote: Joi.string().max(1000).optional().allow(''),
    blockUser: Joi.boolean().optional(),
    removeContent: Joi.boolean().optional()
  }),

  declineReport: Joi.object({
    adminNote: Joi.string().min(10).max(1000).required()
  })
};

module.exports = reportSchemas;