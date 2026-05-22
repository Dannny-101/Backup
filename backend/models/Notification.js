const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'new_lead', 'lead_status_change', 'new_chat', 'new_booking', 
      'booking_status_change', 'listing_view_milestone', 'new_task',
      'task_completed', 'task_assigned', 'admin_login', 'system'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipient: {
    type: { type: String, enum: ['superadmin', 'all', 'specific'], default: 'superadmin' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  data: {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    chatSessionId: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  soundPlayed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ 'recipient.type': 1, 'recipient.userId': 1 });
notificationSchema.index({ soundPlayed: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
