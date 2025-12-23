const router = require("express").Router();
const { auth, checkAdmin } = require("../middleware/auth");
const adminCtrl = require("../controllers/adminCtrl");
const { validate } = require("../middleware/validate");
const Joi = require("joi");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination } = require("../middleware/validation");

const blockUserSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    "string.min": "Block reason must be at least 10 characters",
    "string.max": "Block reason cannot exceed 500 characters",
    "any.required": "Block reason is required",
  }),
});

const acceptReportSchema = Joi.object({
  actionTaken: Joi.string()
    .valid(
      "none",
      "warning",
      "content_removed",
      "account_suspended",
      "account_banned"
    )
    .required()
    .messages({
      "any.only": "Invalid action taken value",
      "any.required": "Action taken is required",
    }),
  adminNote: Joi.string().max(1000).optional().allow(""),
  blockUser: Joi.boolean().optional(),
  removeContent: Joi.boolean().optional(),
});

const declineReportSchema = Joi.object({
  adminNote: Joi.string().min(10).max(1000).required().messages({
    "string.min": "Admin note must be at least 10 characters",
    "string.max": "Admin note cannot exceed 1000 characters",
    "any.required": "Admin note is required when declining a report",
  }),
});

const unblockUserSchema = Joi.object({
  note: Joi.string().max(500).optional().allow(""),
});

const updateBlockStatusSchema = Joi.object({
  action: Joi.string()
    .valid("block", "ban", "suspend", "unblock")
    .required()
    .messages({
      "any.only": "Invalid action. Must be: block, ban, suspend, or unblock",
      "any.required": "Action is required",
    }),
  reason: Joi.string().min(10).max(500).when("action", {
    is: Joi.string().valid("block", "ban", "suspend"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  duration: Joi.number().min(1).max(8760).when("action", {
    is: "suspend",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    "number.min": "Duration must be at least 1 hour",
    "number.max": "Duration cannot exceed 1 year (8760 hours)",
  }),
});


router.get("/get_total_users", auth, checkAdmin, adminCtrl.getTotalUsers);
router.get("/get_total_posts", auth, checkAdmin, adminCtrl.getTotalPosts);
router.get("/get_total_comments", auth, checkAdmin, adminCtrl.getTotalComments);
router.get("/get_total_likes", auth, checkAdmin, adminCtrl.getTotalLikes);
router.get("/get_total_spam_posts", auth, checkAdmin, adminCtrl.getTotalSpamPosts);

router.get("/get_spam_posts", auth, checkAdmin, validatePagination, adminCtrl.getSpamPosts);
router.get("/spam_post/:id", auth, checkAdmin, validateObjectId("id"), adminCtrl.getSpamPostDetail);
router.delete("/delete_spam_posts/:id", auth, checkAdmin, validateObjectId("id"), adminCtrl.deleteSpamPost);

router.get("/notifications", auth, checkAdmin, validatePagination, adminCtrl.getNotifications);
router.get("/notification/:id", auth, checkAdmin, validateObjectId("id"), adminCtrl.getNotificationDetail);

router.get("/users", auth, checkAdmin, validatePagination, adminCtrl.getUsers);
router.get("/user/:id", auth, checkAdmin, validateObjectId("id"), adminCtrl.getUserDetail);

router.post(
  "/admin/user/:id/block",
  auth,
  checkAdmin,
  validateObjectId("id"),
  validate(blockUserSchema),
  adminCtrl.blockUserAccount
);

router.post(
  "/admin/user/:id/unblock",
  auth,
  checkAdmin,
  validateObjectId("id"),
  adminCtrl.unblockUserAccount
);

router.get("/analytics", auth, checkAdmin, adminCtrl.getSiteAnalytics);
router.get("/recent_activities", auth, checkAdmin, adminCtrl.getRecentActivities);

router.get("/reports", auth, checkAdmin, validatePagination, adminCtrl.getAllReports);
router.get("/reports/users", auth, checkAdmin, validatePagination, adminCtrl.getReportedUsers);
router.get("/report/:reportId", auth, checkAdmin, validateObjectId("reportId"), adminCtrl.getReportDetails);

router.post(
  "/report/:reportId/accept",
  auth,
  checkAdmin,
  validateObjectId("reportId"),
  validate(acceptReportSchema),
  adminCtrl.acceptReport
);

router.post(
  "/report/:reportId/decline",
  auth,
  checkAdmin,
  validateObjectId("reportId"),
  validate(declineReportSchema),
  adminCtrl.declineReport
);

router.patch(
  "/report/:reportId/reviewing",
  auth,
  checkAdmin,
  validateObjectId("reportId"),
  adminCtrl.markReportAsReviewing
);

router.get(
  "/user/:userId/block-history",
  auth,
  checkAdmin,
  validateObjectId("userId"),
  adminCtrl.getUserBlockHistory
);

router.post(
  "/user/:userId/unblock",
  auth,
  checkAdmin,
  validateObjectId("userId"),
  validate(unblockUserSchema),
  adminCtrl.unblockUser
);

router.get(
  "/blocked-users",
  auth,
  checkAdmin,
  validatePagination,
  adminCtrl.getBlockedUsers
);

router.get(
  "/pending-auto-unblock",
  auth,
  checkAdmin,
  adminCtrl.getPendingAutoUnblock
);

router.post(
  "/trigger-auto-unblock",
  auth,
  checkAdmin,
  adminCtrl.triggerAutoUnblockCheck
);

router.patch(
  "/user/:userId/block-status",
  auth,
  checkAdmin,
  validateObjectId("userId"),
  validate(updateBlockStatusSchema),
  adminCtrl.updateBlockStatus
);

module.exports = router;