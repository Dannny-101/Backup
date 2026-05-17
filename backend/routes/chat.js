const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

// POST send message
res.cookie('chatSessionId', chatSession, { 
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
});
router.post('/', async (req, res) => {
    try {
        const { sessionId, name, email, message, isAdmin } = req.body;

        let chatSession = sessionId;
        if (!chatSession) {
            chatSession = uuidv4();
        }

        const chatMessage = await ChatMessage.create({
            sessionId: chatSession,
            name,
            email,
            message,
            isAdmin: isAdmin || false,
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, data: chatMessage, sessionId: chatSession });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// GET messages by session
router.get('/:sessionId', async (req, res) => {
    try {
        const messages = await ChatMessage.find({ sessionId: req.params.sessionId })
            .sort({ createdAt: 1 });
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET all active chat sessions (admin)
router.get('/admin/sessions', async (req, res) => {
    try {
        const sessions = await ChatMessage.aggregate([
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: '$sessionId',
                lastMessage: { $first: '$message' },
                lastMessageAt: { $first: '$createdAt' },
                name: { $first: '$name' },
                email: { $first: '$email' },
                unreadCount: { 
                    $sum: { $cond: [{ $eq: ['$isAdmin', false] }, { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }, 0] }
                }
            }},
            { $sort: { lastMessageAt: -1 } }
        ]);
        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark messages as read
router.put('/read/:sessionId', async (req, res) => {
    try {
        await ChatMessage.updateMany(
            { sessionId: req.params.sessionId, isAdmin: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
