const Joi = require("joi");

const friendSchemas = {
  sendRequest: Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
};

module.exports = friendSchemas;