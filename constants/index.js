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

  NOTIFICATION_TYPES: {
    LIKE: 'like',
    COMMENT: 'comment',
    REPLY: 'reply',
    LIKE_COMMENT: 'like_comment',
    SHARE: 'share',
    
    FOLLOW: 'follow',
    MENTION: 'mention',
    TAG: 'tag',
    
    STORY_VIEW: 'story_view',
    STORY_REPLY: 'story_reply',
    
    GROUP_MENTION: 'group_mention',
    GROUP_INVITE: 'group_invite',
    GROUP_REMOVED: 'group_removed',
    GROUP_ROLE_CHANGED: 'group_role_changed',
    
    FRIEND_REQUEST: 'friend_request',
    FRIEND_ACCEPT: 'friend_accept',
    
    REPORT_CREATED: 'report_created',
    REPORT_ACCEPTED: 'report_accepted',
    REPORT_DECLINED: 'report_declined',
    REPORT_RESOLVED: 'report_resolved',
    
    CONTENT_REMOVED: 'content_removed',
    CONTENT_HIDDEN: 'content_hidden',
    
    ACCOUNT_BLOCKED: 'account_blocked',
    ACCOUNT_UNBLOCKED: 'account_unblocked',
    WARNING: 'warning',
    
    SYSTEM_MAINTENANCE: 'system_maintenance',
    POLICY_UPDATE: 'policy_update',
    SECURITY_ALERT: 'security_alert',
  },

  NOTIFICATION_PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  },

  BLOCK_TYPES: {
    ADMIN_BLOCK: 'admin_block',
    TEMPORARY_SUSPENSION: 'temporary_suspension',
    PERMANENT_BAN: 'permanent_ban',
    AUTO_SUSPEND: 'auto_suspend'
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
    ADMIN_NOTE: 1000,
    NOTIFICATION_TEXT: 200,
    NOTIFICATION_CONTENT: 500
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
  },

  SOCKET_EVENTS: {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    JOIN_USER: 'joinUser',
    JOIN_ADMIN: 'joinAdmin',
    
    LIKE_POST: 'likePost',
    UNLIKE_POST: 'unLikePost',
    CREATE_COMMENT: 'createComment',
    DELETE_COMMENT: 'deleteComment',
    SHARE_POST: 'sharePost',
    UNSHARE_POST: 'unsharePost',
    
    CREATE_NOTIFY: 'createNotify',
    REMOVE_NOTIFY: 'removeNotify',
    MARK_NOTIFY_READ: 'markNotifyRead',
    CREATE_NOTIFY_TO_CLIENT: 'createNotifyToClient',
    REMOVE_NOTIFY_TO_CLIENT: 'removeNotifyToClient',
    
    ADD_MESSAGE: 'addMessage',
    ADD_MESSAGE_TO_CLIENT: 'addMessageToClient',
    TYPING: 'typing',
    USER_TYPING: 'userTyping',
    
    JOIN_GROUP: 'joinGroup',
    LEAVE_GROUP: 'leaveGroup',
    SEND_GROUP_MESSAGE: 'sendGroupMessage',
    NEW_GROUP_MESSAGE: 'newGroupMessage',
    GROUP_TYPING: 'groupTyping',
    
    ACCOUNT_BLOCKED: 'accountBlocked',
    ACCOUNT_UNBLOCKED: 'accountUnblocked',
    FORCE_LOGOUT: 'forceLogout',
    ADMIN_BROADCAST: 'adminBroadcast',
    ADMIN_ANNOUNCEMENT: 'adminAnnouncement',
    
    SERVER_SHUTDOWN: 'serverShutdown',
    USER_ONLINE: 'userOnline',
    USER_OFFLINE: 'userOffline',
  },

  SECURITY_ALERT_TYPES: {
    NEW_LOGIN: 'new_login',
    PASSWORD_CHANGED: 'password_changed',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    NEW_DEVICE: 'new_device',
    UNUSUAL_LOCATION: 'unusual_location'
  },

  POLICY_TYPES: {
    TERMS: 'terms',
    PRIVACY: 'privacy',
    COMMUNITY: 'community',
    COPYRIGHT: 'copyright'
  },

  AUTO_BLOCK_THRESHOLDS: {
    CRITICAL_REPORTS: 2,        
    HIGH_SEVERITY_REPORTS: 3,   
    GENERAL_REPORTS: 5,         
    
    CRITICAL_DURATION: 7 * 24,  
    HIGH_DURATION: 3 * 24,      
    GENERAL_DURATION: 24,       
  },

  RATE_LIMITS: {
    REPORT_PER_HOUR: 10,
    POST_PER_HOUR: 30,
    COMMENT_PER_MINUTE: 10,
    MESSAGE_PER_MINUTE: 30,
    LIKE_PER_MINUTE: 60,
    FOLLOW_PER_HOUR: 100,
  },

  TIME_CONSTANTS: {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
  }
};