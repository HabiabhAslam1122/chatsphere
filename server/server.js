const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
const conversationRoutes = require('./routes/conversationRoutes');
app.use('/api/conversations', conversationRoutes);

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const Message = require('./models/Message');
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_conversation', async (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);

    const previousMessages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(50);
    socket.emit('load_messages', previousMessages);
  });

  socket.on('typing', ({ conversationId, senderId }) => {
    socket.to(conversationId).emit('user_typing', senderId);
  });

  socket.on('send_message', async ({ conversationId, sender, text }) => {    const newMessage = await Message.create({
      conversation: conversationId,
      sender,
      text,
    });

    io.to(conversationId).emit('receive_message', newMessage);
  });
    socket.on('delete_message', ({ conversationId, messageId }) => {
    io.to(conversationId).emit('message_deleted', messageId);
  });

   socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));