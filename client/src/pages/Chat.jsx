import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserId, setOtherUserId] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUserId, setTypingUserId] = useState('');

  const isOnline = onlineUsers.includes(otherUserId);
  const isTyping = typingUserId === otherUserId;

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/api/conversations/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((conversations) => {
        const current = conversations.find((c) => c._id === conversationId);
        if (current) {
          const other = current.participants.find((p) => p._id !== user.id);
          setOtherUserName(other?.name || 'Unknown');
          setOtherUserId(other?._id || '');
        }
      });

    socket.emit('join_conversation', conversationId);
    socket.emit('user_online', user.id);

    socket.on('online_users', (onlineUserIds) => {
      setOnlineUsers(onlineUserIds);
    });

    socket.on('user_typing', (incomingTypingUserId) => {
      setTypingUserId(incomingTypingUserId);
      setTimeout(() => setTypingUserId(''), 2000);
    });

    socket.on('load_messages', (previousMessages) => {
      setMessages(previousMessages);
    });

    socket.on('receive_message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on('message_deleted', (messageId) => {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== messageId));
    });

    return () => {
      socket.off('load_messages');
      socket.off('receive_message');
      socket.off('online_users');
      socket.off('user_typing');
      socket.off('message_deleted');
    };
  }, [conversationId, token, navigate]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { conversationId, senderId: user.id });
  };

  const sendMessage = () => {
    if (message.trim() === '') return;
    socket.emit('send_message', {
      conversationId,
      sender: user.id,
      text: message,
    });
    setMessage('');
  };

  const deleteMessage = async (messageId) => {
    try {
      await fetch(`http://localhost:5000/api/conversations/message/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.emit('delete_message', { conversationId, messageId });
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <Link to="/conversations" className="back-link">&larr;</Link>
        <div className="chat-header-info">
          <strong>Chat with {otherUserName}</strong>
          <span className={isOnline ? 'status-online' : 'status-offline'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {isTyping && <p className="typing-indicator">{otherUserName} is typing...</p>}

      <div className="messages-area">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`message-bubble ${msg.sender === user.id ? 'message-mine' : 'message-theirs'}`}
          >
            {msg.text}
            {msg.sender === user.id && (
              <span className="delete-btn" onClick={() => deleteMessage(msg._id)}>×</span>
            )}
          </div>
        ))}
      </div>

      <div className="message-input-area">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button className="send-btn" onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
}

export default Chat;