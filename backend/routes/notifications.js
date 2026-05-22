const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Import auth from admin routes
const { authMiddleware } = require('./admin');

// Apply auth to ALL notification routes
router.use(authMiddleware);

// ── THESE MUST COME BEFORE /:id ROUTES ──

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notifications/cleanup
router.delete('/cleanup', async (req, res) => {
  try {
    const count = await Notification.countDocuments();
    if (count > 100) {
      const old = await Notification.find().sort({ createdAt: -1 }).skip(100);
      const ids = old.map(n => n._id);
      await Notification.deleteMany({ _id: { $in: ids } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GENERIC ROUTES AFTER SPECIFIC ONES ──

// GET /api/notifications — Get all (for dropdown)
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/recent — For dashboard activity feed
router.get('/recent', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, unreadCount, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read — Mark single as read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
      readAt: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
