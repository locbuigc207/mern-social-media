const router = require("express").Router();
const { auth, checkAdmin } = require("../middleware/auth");
const analyticsCtrl = require("../controllers/analyticsCtrl");
const { validatePagination } = require("../middleware/validation");

router.get("/analytics/dashboard", auth, checkAdmin, analyticsCtrl.getDashboardStats);
router.get("/analytics/user-growth", auth, checkAdmin, analyticsCtrl.getUserGrowth);
router.get("/analytics/engagement", auth, checkAdmin, analyticsCtrl.getEngagementMetrics);
router.get("/analytics/content", auth, checkAdmin, analyticsCtrl.getContentMetrics);
router.get("/analytics/reports", auth, checkAdmin, analyticsCtrl.getReportAnalytics);
router.get("/analytics/retention", auth, checkAdmin, analyticsCtrl.getUserRetention);
router.get("/analytics/export", auth, checkAdmin, analyticsCtrl.exportAnalytics);

module.exports = router;