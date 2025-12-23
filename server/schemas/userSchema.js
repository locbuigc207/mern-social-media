const Joi = require('joi');

const userSchemas = {
  updateProfile: Joi.object({
    fullname: Joi.string().min(2).max(25).required(),
    avatar: Joi.string().uri().optional(),
    mobile: Joi.string().max(20).optional().allow(''),
    address: Joi.string().max(200).optional().allow(''),
    story: Joi.string().max(200).optional().allow(''),
    website: Joi.string().uri().optional().allow(''),
    gender: Joi.string().valid('male', 'female', 'other').optional()
  }),

  updatePrivacy: Joi.object({
    profileVisibility: Joi.string().valid('public', 'private', 'friends').optional(),
    whoCanMessage: Joi.string().valid('everyone', 'following', 'none').optional(),
    whoCanComment: Joi.string().valid('everyone', 'following', 'none').optional(),
    whoCanTag: Joi.string().valid('everyone', 'following', 'none').optional(),
    showFollowers: Joi.boolean().optional(),
    showFollowing: Joi.boolean().optional()
  }),

  search: Joi.object({
    username: Joi.string().min(1).required()
  })
};

module.exports = userSchemas;