const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError } = require("../utils/AppError");

const notifyCtrl = {
  createNotify: asyncHandler(async (req, res) => {
    const { id, recipients, url, text, content, image } = req.body;

    if (!recipients || recipients.length === 0) {
      throw new ValidationError("Recipients are required.");
    }

    if (!text) {
      throw new ValidationError("Notification text is required.");
    }

    const notifyExists = await Notifies.findOne({ id, recipients, url });
    
    if (notifyExists) {
      return res.status(400).json({ msg: "This notification already exists." });
    }

    const newNotify = new Notifies({
      id,
      recipients,
      url,
      text,
      content,
      image,
      user: req.user._id,
    });

    await newNotify.save();

    logger.info('Notification created', {
      notifyId: newNotify._id,
      userId: req.user._id,
      recipients: recipients.length
    });

    res.json({ 
      msg: "Notification created successfully.",
      notification: newNotify 
    });
  }),

  removeNotify: asyncHandler(async (req, res) => {
    const notify = await Notifies.findOneAndDelete({
      id: req.params.id,
      url: req.query.url,
    });

    if (!notify) {
      throw new NotFoundError("Notification");
    }

    logger.info('Notification removed', {
      notifyId: req.params.id,
      userId: req.user._id
    });

    res.json({ msg: "Notification removed successfully." });
  }),

  getNotifies: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifies = await Notifies.find({ recipients: req.user._id })
      .sort("-createdAt")
      .populate("user", "avatar username fullname")
      .skip(skip)
      .limit(limit);

    const total = await Notifies.countDocuments({ recipients: req.user._id });
    const unreadCount = await Notifies.countDocuments({
      recipients: req.user._id,
      isRead: false,
    });

    logger.info('Notifications retrieved', {
      userId: req.user._id,
      count: notifies.length,
      unreadCount
    });

    res.json({
      notifies,
      result: notifies.length,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  isReadNotify: asyncHandler(async (req, res) => {
    const notifies = await Notifies.findOneAndUpdate(
      { _id: req.params.id },
      { isRead: true },
      { new: true }
    );

    if (!notifies) {
      throw new NotFoundError("Notification");
    }

    logger.info('Notification marked as read', {
      notifyId: req.params.id,
      userId: req.user._id
    });

    res.json({ 
      msg: "Notification marked as read.",
      notification: notifies
    });
  }),

  deleteAllNotifies: asyncHandler(async (req, res) => {
    const result = await Notifies.deleteMany({ recipients: req.user._id });

    logger.audit('All notifications deleted', req.user._id, {
      count: result.deletedCount
    });

    res.json({ 
      msg: `${result.deletedCount} notification(s) deleted successfully.`,
      count: result.deletedCount
    });
  }),

  markAllAsRead: asyncHandler(async (req, res) => {
    const result = await Notifies.updateMany(
      { 
        recipients: req.user._id,
        isRead: false
      },
      { 
        $set: { isRead: true }
      }
    );

    logger.info('All notifications marked as read', {
      userId: req.user._id,
      count: result.modifiedCount
    });

    res.json({ 
      msg: `${result.modifiedCount} notification(s) marked as read.`,
      count: result.modifiedCount
    });
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await Notifies.countDocuments({
      recipients: req.user._id,
      isRead: false,
    });

    res.json({ 
      unreadCount: count 
    });
  }),

  deleteNotify: asyncHandler(async (req, res) => {
    const notify = await Notifies.findById(req.params.id);

    if (!notify) {
      throw new NotFoundError("Notification");
    }

    if (!notify.recipients.includes(req.user._id)) {
      return res.status(403).json({ msg: "You cannot delete this notification." });
    }

    await Notifies.findByIdAndDelete(req.params.id);

    logger.info('Notification deleted', {
      notifyId: req.params.id,
      userId: req.user._id
    });

    res.json({ msg: "Notification deleted successfully." });
  }),

  getNotifyById: asyncHandler(async (req, res) => {
    const notify = await Notifies.findById(req.params.id)
      .populate("user", "avatar username fullname");

    if (!notify) {
      throw new NotFoundError("Notification");
    }

    if (!notify.recipients.includes(req.user._id)) {
      return res.status(403).json({ msg: "You cannot view this notification." });
    }

    if (!notify.isRead) {
      notify.isRead = true;
      await notify.save();
    }

    logger.info('Notification retrieved', {
      notifyId: req.params.id,
      userId: req.user._id
    });

    res.json({ notification: notify });
  }),

  searchNotifies: asyncHandler(async (req, res) => {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const searchQuery = {
      recipients: req.user._id,
      $or: [
        { text: { $regex: query.trim(), $options: 'i' } },
        { content: { $regex: query.trim(), $options: 'i' } }
      ]
    };

    const notifies = await Notifies.find(searchQuery)
      .populate("user", "avatar username fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Notifies.countDocuments(searchQuery);

    logger.info('Notifications searched', {
      query,
      userId: req.user._id,
      results: notifies.length
    });

    res.json({
      notifies,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  }),

  getNotifiesByType: asyncHandler(async (req, res) => {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const validTypes = ['like', 'comment', 'follow', 'mention', 'reply', 'share'];
    
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid notification type. Valid types: ${validTypes.join(', ')}`);
    }

    const notifies = await Notifies.find({
      recipients: req.user._id,
      url: { $regex: type, $options: 'i' }
    })
      .populate("user", "avatar username fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Notifies.countDocuments({
      recipients: req.user._id,
      url: { $regex: type, $options: 'i' }
    });

    logger.info('Notifications retrieved by type', {
      type,
      userId: req.user._id,
      count: notifies.length
    });

    res.json({
      notifies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      type
    });
  })
};

module.exports = notifyCtrl;