const router = require('express').Router();
const auth = require('../middleware/auth');
const notifyCtrl = require('../controllers/notifyCtrl');
const validateObjectId = require('../middleware/validateObjectId');

router.post('/notify', 
  auth, 
  notifyCtrl.createNotify
);

router.delete('/notify/:id', 
  auth, 
  validateObjectId('id'), 
  notifyCtrl.removeNotify
);

router.get("/notifies", 
  auth, 
  notifyCtrl.getNotifies
);

router.patch("/isReadNotify/:id", 
  auth, 
  validateObjectId('id'), 
  notifyCtrl.isReadNotify
);

router.delete("/deleteAllNotify", 
  auth, 
  notifyCtrl.deleteAllNotifies
);

module.exports = router;