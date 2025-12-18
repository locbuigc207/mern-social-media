const router = require('express').Router();
const auth = require('../middleware/auth');
const notifyCtrl = require('../controllers/notifyCtrl');
const validateObjectId = require('../middleware/validateObjectId');

// Create notify
router.post('/notify', 
  auth, 
  notifyCtrl.createNotify
);

// Delete notify
router.delete('/notify/:id', 
  auth, 
  validateObjectId('id'), 
  notifyCtrl.removeNotify
);

// Get notifies
router.get("/notifies", 
  auth, 
  notifyCtrl.getNotifies
);

// Mark as read
router.patch("/isReadNotify/:id", 
  auth, 
  validateObjectId('id'), 
  notifyCtrl.isReadNotify
);

// Delete all
router.delete("/deleteAllNotify", 
  auth, 
  notifyCtrl.deleteAllNotifies
);

module.exports = router;