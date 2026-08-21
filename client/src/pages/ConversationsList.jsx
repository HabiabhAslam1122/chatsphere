import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ConversationsList() {
  const [conversations, setConversations] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await fetch('https://chatsphere-backend-npg8.onrender.com/api/conversations/my', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setConversations(data);
  };

  const startNewConversation = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('https://chatsphere-backend-npg8.onrender.com/api/conversations/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Could not start conversation');
        return;
      }

      navigate(`/chat/${data._id}`);
    } catch (err) {
      setError('Something went wrong');
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find((p) => p._id !== user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="conv-page">
           <div className="conv-header">
        <div>
          <h1>ChatSphere</h1>
          <span style={{ fontSize: '13px', opacity: 0.85 }}>Logged in as {user?.name}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <form className="new-chat-form" onSubmit={startNewConversation}>
        <input
          type="email"
          placeholder="Enter email to start chat"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Start</button>
      </form>
      {error && <p className="error-text" style={{ padding: '0 20px' }}>{error}</p>}

      <p className="conv-list-title">Your Conversations</p>
      {conversations.map((conv) => {
        const other = getOtherParticipant(conv);
        return (
          <div
            key={conv._id}
            className="conv-item"
            onClick={() => navigate(`/chat/${conv._id}`)}
          >
                        <div className="conv-avatar">{other?.name?.charAt(0).toUpperCase()}</div>
            <div className="conv-info">
              <strong>{other?.name}</strong>
              <span>{other?.email}</span>
            </div>
            {conv.unreadCount > 0 && <div className="unread-dot">{conv.unreadCount}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default ConversationsList;