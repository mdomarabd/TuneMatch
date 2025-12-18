import { useEffect, useState } from 'react';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { Route, BrowserRouter as Router, Routes, Link } from 'react-router-dom';
import ParticleBackground from './components/ParticleBackground';
import Auth from './components/Auth';
import PlaylistModal from './components/PlaylistModal';
import ProfilePage from './pages/ProfilePage';
import HatBox from './components/HatBox';
import SongList from './components/SongList';

import { getRecommendations, getMe } from './api';
import { FaUserCircle, FaSignOutAlt, FaMusic } from 'react-icons/fa';

function Home({ user, setUser, setIsAuthOpen, setIsPlaylistOpen }) {
  const toast = useToast();
  const [recommendations, setRecommendations] = useState([]);
  const [moods, setMoods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (text, playlistSize = 10) => {
    setIsLoading(true);
    try {
      const data = await getRecommendations(text, playlistSize);
      setRecommendations(data.recommendations);
      setMoods(data.moods);
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      toast.error("Something went wrong with the magic hat!");
    } finally {
      setIsLoading(false);
    }
  };
  // ... existing code

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <>
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '3rem',
        marginTop: '1rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '1rem' }}>
          {user ? (
            <>
              <Link to="/profile" style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'background 0.2s'
              }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <FaUserCircle />
                )}
                {user.full_name}
              </Link>

              {/* Quick Playlist Access Modal Button - Optional, but keeping for quick access */}
              <button
                onClick={() => setIsPlaylistOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Quick Playlist View"
              >
                <FaMusic />
              </button>

              <button onClick={handleLogout} style={{
                background: 'rgba(239,68,68,0.2)',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '50%',
                color: '#fca5a5',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} title="Logout">
                <FaSignOutAlt />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '0.5rem 1.5rem',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Login / Join
            </button>
          )}
        </div>

        <h1 style={{
          fontSize: '3.5rem',
          background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          TuneMatch
        </h1>
        <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>AI-Powered Mood Musicalizer</p>
      </header>

      <main style={{ zIndex: 10, position: 'relative' }}>
        <HatBox onSearch={handleSearch} />
        <SongList moods={moods} recommendations={recommendations} user={user} onLoginRequest={() => setIsAuthOpen(true)} />
      </main>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (e) {
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  };

  return (
    <Router>
      <ToastProvider>
        <ParticleBackground>
          <div style={{
            minHeight: '100vh',
            padding: '2rem',
            // background: 'radial-gradient(circle at 50% 0%, #1a1a2e 0%, #0d0d0d 100%)' // Removed to let particles show, handled by ParticleBackground
          }}>
            <Auth
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onLoginSuccess={checkUser}
            />

            {/* Quick View Modal */}
            <PlaylistModal
              isOpen={isPlaylistOpen}
              onClose={() => setIsPlaylistOpen(false)}
              user={user}
            />

            <Routes>
              <Route path="/" element={
                <Home
                  user={user}
                  setUser={setUser}
                  setIsAuthOpen={setIsAuthOpen}
                  setIsPlaylistOpen={setIsPlaylistOpen}
                />
              } />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </div>
        </ParticleBackground>
      </ToastProvider>
    </Router>
  );
}

export default App;
