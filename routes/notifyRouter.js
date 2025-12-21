const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const notifyCtrl = require("../controllers/notifyCtrl");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination } = require("../middleware/validation");
const { interactionLimiter } = require("../middleware/rateLimiter");

router.use(auth);

router.post("/notify", interactionLimiter, notifyCtrl.createNotify);

router.get("/notifies", 
  validatePagination,
  notifyCtrl.getNotifies
);

// Alias for compatibility
router.get("/notifications", 
  validatePagination,
  notifyCtrl.getNotifies
);

router.get("/notifies/unread/count", notifyCtrl.getUnreadCount);

router.get("/notifies/search", validatePagination, notifyCtrl.searchNotifies);

router.get(
  "/notifies/type/:type",
  validatePagination,
  notifyCtrl.getNotifiesByType
);

router.get("/notify/:id", validateObjectId("id"), notifyCtrl.getNotifyById);

router.patch(
  "/notify/:id/read",
  validateObjectId("id"),
  notifyCtrl.isReadNotify
);

router.patch("/notifies/read-all", notifyCtrl.markAllAsRead);

router.delete("/notify/:id", validateObjectId("id"), notifyCtrl.deleteNotify);

router.delete("/notify/:id", validateObjectId("id"), notifyCtrl.removeNotify);

router.delete("/notifies", notifyCtrl.deleteAllNotifies);

module.exports = router;
