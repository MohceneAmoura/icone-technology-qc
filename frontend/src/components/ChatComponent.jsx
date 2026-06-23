import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function ChatComponent({ currentUser, token }) {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    console.log('👤 Current Chat User:', currentUser);
  }, [currentUser]);

  // Auto scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    // Authenticate socket
    newSocket.emit('authenticate', token);

    // Listen for new messages
    newSocket.on('newMessage', (msg) => {
      console.log('📨 New message received:', msg);
      if (selectedUser && 
          (String(msg.sender_id) === String(selectedUser.id) || String(msg.receiver_id) === String(selectedUser.id))) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => newSocket.disconnect();
  }, [token, selectedUser]);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('📥 Fetching chat users...');
        const res = await fetch('/api/chat/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          console.error('❌ Failed to fetch users:', res.statusText);
          return;
        }
        const data = await res.json();
        console.log('✅ Users fetched:', data);
        console.log('🆔 Current user ID:', currentUser.id, 'Type:', typeof currentUser.id);
        // Filter out current user (handle both string and number IDs)
        const otherUsers = data.filter(u => String(u.id) !== String(currentUser.id));
        console.log('👥 Other users available:', otherUsers);
        setUsers(otherUsers);
        // Auto select the first user if available
        if (otherUsers.length > 0 && !selectedUser) {
          setSelectedUser(otherUsers[0]);
        }
      } catch (err) {
        console.error('❌ Error fetching users:', err);
      }
    };
    fetchUsers();
  }, [token, currentUser.id, selectedUser]);

  // Fetch messages when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      try {
        console.log('📥 Fetching messages with user:', selectedUser.id);
        const res = await fetch(`/api/chat/messages/${selectedUser.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          console.error('❌ Failed to fetch messages:', res.statusText);
          return;
        }
        const data = await res.json();
        console.log('✅ Messages fetched:', data);
        setMessages(data);
      } catch (err) {
        console.error('❌ Error fetching messages:', err);
      }
    };
    fetchMessages();
  }, [selectedUser, token]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          message: newMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, data.chatMessage]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
      <div className="glass-panel-title" style={{ marginBottom: '1rem' }}>
        💬 Chat avec l'équipe
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Users List */}
        <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
          <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Utilisateurs en ligne
          </h5>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Aucun autre utilisateur disponible
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: selectedUser?.id === user.id 
                      ? 'linear-gradient(135deg, hsla(210, 100%, 56%, 0.15), hsla(210, 100%, 56%, 0.05))' 
                      : 'var(--bg-card)',
                    color: selectedUser?.id === user.id ? 'var(--primary)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: selectedUser?.id === user.id ? '700' : '500',
                    transition: 'all 0.2s',
                    borderColor: selectedUser?.id === user.id ? 'hsla(210, 100%, 56%, 0.3)' : 'var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.photo ? (
                      <img 
                        src={user.photo} 
                        alt={user.fullname} 
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }} 
                      />
                    ) : (
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--success))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '0.95rem'
                      }}>
                        {getInitials(user.fullname)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.95rem' }}>{user.fullname}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {user.role === 'admin' ? 'Administrateur' : 'IT Support'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedUser ? (
            <div className="chat-container" style={{ height: '450px' }}>
              {/* Chat Header */}
              <div className="chat-header">
                {selectedUser.photo ? (
                  <img 
                    src={selectedUser.photo} 
                    alt={selectedUser.fullname} 
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }} 
                  />
                ) : (
                  <div className="chat-header-avatar">
                    {getInitials(selectedUser.fullname)}
                  </div>
                )}
                <div className="chat-header-info">
                  <h4>{selectedUser.fullname}</h4>
                  <p>{selectedUser.role === 'admin' ? 'Administrateur' : 'IT Support'}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: '2rem',
                    fontSize: '0.95rem'
                  }}>
                    Aucun message encore. Commencez la conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.sender_id === currentUser.id;
                    const user = isSent ? currentUser : selectedUser;
                    return (
                      <div
                        key={msg.id}
                        className={`chat-message ${isSent ? 'sent' : 'received'}`}
                        style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexDirection: isSent ? 'row-reverse' : 'row' }}
                      >
                        {user.photo ? (
                          <img 
                            src={user.photo} 
                            alt={user.fullname} 
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }} 
                          />
                        ) : (
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--success))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {getInitials(user.fullname)}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div>{msg.message}</div>
                          <div className="chat-message-time">
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="chat-input-container">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Écrire un message à ${selectedUser.fullname}...`}
                  className="chat-input"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="chat-send-btn"
                >
                  ➤
                </button>
              </form>
            </div>
          ) : (
            <div style={{
              height: '450px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '1rem'
            }}>
              Sélectionnez un utilisateur pour commencer le chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
