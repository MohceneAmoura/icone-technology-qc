import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './components/Login';
import ITDashboard from './components/ITDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// Create Theme Context
const ThemeContext = createContext();

// Custom hook to use theme
export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage first, default to light mode
    const savedTheme = localStorage.getItem('icone_theme');
    return savedTheme === 'dark';
  });

  // Toggle theme and save to localStorage
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('icone_theme', newMode ? 'dark' : 'light');
  };

  // Apply theme class to body on mount and when theme changes
  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
  }, [isDarkMode]);

  useEffect(() => {
    // Check for saved session on mount
    const checkSession = async () => {
      const savedToken = localStorage.getItem('icone_token');
      const savedUser = localStorage.getItem('icone_user');

      if (savedToken && savedUser) {
        try {
          // Verify session validity with backend
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(savedToken);
          } else {
            // Token expired or invalid
            handleLogout();
          }
        } catch (err) {
          console.error('Session verification error:', err);
          // If network error, keep offline session
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('icone_token');
    localStorage.removeItem('icone_user');
    setUser(null);
    setToken('');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', animation: 'pulse-glow 2s infinite' }}>🏭</span>
          Loading System Workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </ThemeContext.Provider>
    );
  }

  if (user.role === 'admin') {
    return (
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <AdminDashboard user={user} token={token} onLogout={handleLogout} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ITDashboard user={user} token={token} onLogout={handleLogout} />
    </ThemeContext.Provider>
  );
}
