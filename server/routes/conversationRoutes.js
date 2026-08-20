const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { startConversation, getMyConversations, deleteMessage } = require('../controllers/conversationController');

router.post('/start', protect, startConversation);
router.get('/my', protect, getMyConversations);
router.delete('/message/:messageId', protect, deleteMessage);

module.exports = router;