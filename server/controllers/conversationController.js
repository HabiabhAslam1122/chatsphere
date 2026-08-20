const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');

// Find or create a conversation between logged-in user and another user (by email)
exports.startConversation = async (req, res) => {
  try {
    const { email } = req.body;
    const myId = req.user._id;

    const otherUser = await User.findOne({ email });
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (otherUser._id.toString() === myId.toString()) {
      return res.status(400).json({ message: "You can't chat with yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [myId, otherUser._id], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, otherUser._id],
      });
    }

    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all conversations for the logged-in user
exports.getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    }).populate('participants', 'name email');

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a message (only if you're the sender)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await message.deleteOne();

    res.status(200).json({ message: 'Message deleted', messageId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};