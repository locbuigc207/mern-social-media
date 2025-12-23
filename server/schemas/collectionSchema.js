const Joi = require("joi");

const collectionSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional().allow(""),
    isPrivate: Joi.boolean().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional().allow(""),
    isPrivate: Joi.boolean().optional(),
  }),
};

module.exports = collectionSchemas;