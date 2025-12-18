const router = require("express").Router();
const auth = require("../middleware/auth");
const adminCtrl = require("../controllers/adminCtrl");
const { 
  validatePagination, 
  validateObjectId,
  validateBody 
} = require("../middleware/validation");

const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: "Access denied. Admin only." });
  }
  next();
};

router.get('/get_total_users', auth, checkAdmin, adminCtrl.getTotalUsers);
router.get("/get_total_posts", auth, checkAdmin, adminCtrl.getTotalPosts);
router.get("/get_total_comments", auth, checkAdmin, adminCtrl.getTotalComments);
router.get("/get_total_likes", auth, checkAdmin, adminCtrl.getTotalLikes);
router.get("/get_total_spam_posts", auth, checkAdmin, adminCtrl.getTotalSpamPosts);
router.get("/get_spam_posts", auth, checkAdmin, validatePagination, adminCtrl.getSpamPosts);
router.get("/spam_post/:id", auth, checkAdmin, validateObjectId('id'), adminCtrl.getSpamPostDetail);
router.delete("/delete_spam_posts/:id", auth, checkAdmin, validateObjectId('id'), adminCtrl.deleteSpamPost);
router.get("/notifications", auth, checkAdmin, validatePagination, adminCtrl.getNotifications);
router.get("/notification/:id", auth, checkAdmin, validateObjectId('id'), adminCtrl.getNotificationDetail);
router.get("/users", auth, checkAdmin, validatePagination, adminCtrl.getUsers);
router.get("/user/:id", auth, checkAdmin, validateObjectId('id'), adminCtrl.getUserDetail);

const blockUserSchema = {
  reason: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 500
  }
};

router.post("/user/:id/block", auth, checkAdmin, validateObjectId('id'), validateBody(blockUserSchema), adminCtrl.blockUserAccount);
router.post("/user/:id/unblock", auth, checkAdmin, validateObjectId('id'), adminCtrl.unblockUserAccount);
router.get("/analytics", auth, checkAdmin, adminCtrl.getSiteAnalytics);
router.get("/recent_activities", auth, checkAdmin, adminCtrl.getRecentActivities);

router.get("/reports", auth, checkAdmin, validatePagination, adminCtrl.getAllReports);
router.get("/reports/users", auth, checkAdmin, validatePagination, adminCtrl.getReportedUsers);
router.get("/report/:reportId", auth, checkAdmin, validateObjectId('reportId'), adminCtrl.getReportDetails);

const acceptReportSchema = {
  actionTaken: {
    type: 'string',
    required: true,
    custom: (value) => {
      const valid = ['none', 'warning', 'content_removed', 'account_suspended', 'account_banned'];
      if (!valid.includes(value)) return 'Invalid action';
    }
  },
  adminNote: {
    type: 'string',
    required: false,
    maxLength: 1000
  },
  blockUser: {
    type: 'boolean',
    required: false
  },
  removeContent: {
    type: 'boolean',
    required: false
  }
};

const declineReportSchema = {
  adminNote: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 1000
  }
};

router.post("/report/:reportId/accept", auth, checkAdmin, validateObjectId('reportId'), validateBody(acceptReportSchema), adminCtrl.acceptReport);
router.post("/report/:reportId/decline", auth, checkAdmin, validateObjectId('reportId'), validateBody(declineReportSchema), adminCtrl.declineReport);
router.patch("/report/:reportId/reviewing", auth, checkAdmin, validateObjectId('reportId'), adminCtrl.markReportAsReviewing);

module.exports = router;