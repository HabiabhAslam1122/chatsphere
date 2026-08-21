import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('https://chatsphere-backend-npg8.onrender.com');

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('https://chatsphere-backend-npg8.onrender.com/api/conversations/my', {
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

    socket.emit('join_conversation', conversationId, user.id);
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

    socket.on('messages_read', ({ readBy }) => {
      if (readBy !== user.id) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.sender === user.id ? { ...msg, read: true } : msg))
        );
      }
    });

    return () => {
      socket.off('load_messages');
      socket.off('receive_message');
      socket.off('online_users');
      socket.off('user_typing');
      socket.off('message_deleted');
      socket.off('messages_read');
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
      await fetch(`https://chatsphere-backend-npg8.onrender.com/api/conversations/message/${messageId}`, {
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
        {messages.map((msg, index) => {
          const msgDate = new Date(msg.createdAt).toDateString();
          const prevDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
          const showDateSeparator = msgDate !== prevDate;

          return (
            <React.Fragment key={msg._id}>
              {showDateSeparator && (
                <div className="date-separator">
                  <span>{new Date(msg.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              <div className={`message-bubble ${msg.sender === user.id ? 'message-mine' : 'message-theirs'}`}>
                {msg.text}
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender === user.id && (
                  <span className={`msg-tick ${msg.read ? 'read' : ''}`}>
                    {msg.read ? '✓✓' : isOnline ? '✓✓' : '✓'}
                  </span>
                )}
                {msg.sender === user.id && (
                  <span className="delete-btn" onClick={() => deleteMessage(msg._id)}>×</span>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
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