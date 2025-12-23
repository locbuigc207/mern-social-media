// server/schemas/settingsSchema.js
const Joi = require("joi");

const settingsSchemas = {
  privacy: Joi.object({
    profileVisibility: Joi.string()
      .valid("public", "private", "friends")
      .optional(),
    whoCanMessage: Joi.string()
      .valid("everyone", "following", "friends", "none")
      .optional(),
    whoCanComment: Joi.string()
      .valid("everyone", "following", "friends", "none")
      .optional(),
    whoCanTag: Joi.string()
      .valid("everyone", "following", "friends", "none")
      .optional(),
    showFollowers: Joi.boolean().optional(),
    showFollowing: Joi.boolean().optional(),
    showOnlineStatus: Joi.boolean().optional(),
  }),

  notifications: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    notifyOnLike: Joi.boolean().optional(),
    notifyOnComment: Joi.boolean().optional(),
    notifyOnFollow: Joi.boolean().optional(),
    notifyOnMessage: Joi.boolean().optional(),
    notifyOnMention: Joi.boolean().optional(),
    notifyOnShare: Joi.boolean().optional(),
  }),

  account: Joi.object({
    language: Joi.string().valid("en", "vi", "ja", "ko").optional(),
    timezone: Joi.string().optional(),
  }),
};

module.exports = settingsSchemas;