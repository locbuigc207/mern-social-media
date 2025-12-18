module.exports = {
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  },

  POST_STATUS: {
    PUBLISHED: 'published',
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    REMOVED: 'removed'
  },

  MODERATION_STATUS: {
    APPROVED: 'approved',
    FLAGGED: 'flagged',
    UNDER_REVIEW: 'under_review',
    REMOVED: 'removed'
  },

  REPORT_REASONS: {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    HATE_SPEECH: 'hate_speech',
    VIOLENCE: 'violence',
    NUDITY: 'nudity',
    FALSE_INFO: 'false_information',
    SCAM: 'scam',
    COPYRIGHT: 'copyright',
    SELF_HARM: 'self_harm',
    TERRORISM: 'terrorism',
    CHILD_EXPLOITATION: 'child_exploitation',
    BULLYING: 'bullying',
    THREATS: 'threats',
    OTHER: 'other'
  },

  REPORT_STATUS: {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    RESOLVED: 'resolved'
  },

  REPORT_PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  ACTION_TAKEN: {
    NONE: 'none',
    WARNING: 'warning',
    CONTENT_REMOVED: 'content_removed',
    ACCOUNT_SUSPENDED: 'account_suspended',
    ACCOUNT_BANNED: 'account_banned'
  },

  PRIVACY_SETTINGS: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    FRIENDS: 'friends',
    FOLLOWING: 'following',
    NONE: 'none'
  },

  FILE_TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    FILE: 'file'
  },

  MAX_LENGTHS: {
    POST_CONTENT: 5000,
    COMMENT_CONTENT: 2000,
    BIO: 200,
    USERNAME: 25,
    FULLNAME: 25,
    STORY_CAPTION: 500,
    GROUP_NAME: 100,
    GROUP_DESCRIPTION: 500,
    MESSAGE_TEXT: 5000,
    REPORT_DESCRIPTION: 500,
    ADMIN_NOTE: 1000
  },

  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  STORY_PRIVACY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    CLOSE_FRIENDS: 'close_friends',
    CUSTOM: 'custom'
  },

  GROUP_ROLES: {
    ADMIN: 'admin',
    MEMBER: 'member'
  },

  MESSAGE_STATUS: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read'
  }
};