const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io available to routes
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/debug', (req, res) => {
  const fs = require('fs');
  const frontendPath = path.join(__dirname, '../frontend');
  res.json({
    __dirname,
    frontendPath,
    frontendExists: fs.existsSync(frontendPath),
    frontendFiles: fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : 'NOT FOUND'
  });
});

app.get('/debug-html', (req, res) => {
  const fs = require('fs');
  const content = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  res.type('text').send(content.substring(0, 500));
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenandsee', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  // ── AUTO-MIGRATION: Promote first admin to superadmin if none exists ──
  try {
    const Admin = require('./models/Admin');
    const superadminExists = await Admin.findOne({ role: 'superadmin' });
    
    if (!superadminExists) {
      const firstAdmin = await Admin.findOne().sort({ createdAt: 1 });
      if (firstAdmin) {
        firstAdmin.role = 'superadmin';
        firstAdmin.isActive = true;
        if (!firstAdmin.name) firstAdmin.name = 'Super Admin';
        await firstAdmin.save();
        console.log(`Auto-migrated: ${firstAdmin.username} promoted to superadmin`);
      }
    }
  } catch (err) {
    console.error('Auto-migration error:', err.message);
  }
})
.catch(err => console.error('MongoDB Connection Error:', err));

// ── API ROUTES ──
app.use('/api/listings', require('./routes/listings'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit', require('./routes/audit').router);
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/tasks', require('./routes/tasks')); // ← NEW: Task board routes

// ── SOCKET.IO EVENTS ──
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Admin joins their room for targeted notifications
  socket.on('join_admin', (adminId) => {
    if (adminId) socket.join(`admin_${adminId}`);
    socket.join('all_admins'); // All admins get task updates
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── FRONTEND ROUTES ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/listing', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/listing.html'));
});

// ── WEEKLY REPORT CRON ──
cron.schedule('0 9 * * 1', async () => {
  try {
    const emailService = require('./utils/email');
    const Lead = require('./models/Lead');
    const Listing = require('./models/Listing');
    const ChatMessage = require('./models/ChatMessage');

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const newLeads = await Lead.countDocuments({ createdAt: { $gte: last7Days } });
    const convertedLeads = await Lead.countDocuments({ status: 'converted', updatedAt: { $gte: last7Days } });
    const totalViews = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
    const chatSessions = await ChatMessage.distinct('sessionId', { createdAt: { $gte: last7Days } });

    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

    await emailService.sendWeeklyReport(
      process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
      { weekRange, newLeads, convertedLeads, totalViews: totalViews[0]?.total || 0, chatSessions: chatSessions.length }
    );

    console.log('Weekly report sent successfully');
  } catch (error) {
    console.error('Failed to send weekly report:', error);
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
