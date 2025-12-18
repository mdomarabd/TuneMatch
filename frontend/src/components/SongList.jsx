import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSpotify, FaMusic, FaSave } from 'react-icons/fa';
import { createPlaylist } from '../api';
import { useToast } from '../contexts/ToastContext';
import InputModal from './InputModal';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

const SongCard = ({ song, index }) => {
    return (
        <motion.div
            variants={item}
            whileHover={{ y: -5, background: 'rgba(255, 255, 255, 0.08)' }}
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'default',
                transition: 'background 0.2s'
            }}
        >
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: 'white'
            }}>
                {index + 1}
            </div>

            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{song.track}</h3>
                <p style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>{song.artist} • {song.genre}</p>
            </div>

            {song.spotify_url && (
                <a
                    href={song.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#1DB954',
                        fontSize: '1.5rem',
                        padding: '0.5rem',
                        display: 'flex'
                    }}
                    title="Open in Spotify"
                >
                    <FaSpotify />
                </a>
            )}
        </motion.div>
    );
};

const SongList = ({ moods, recommendations, user, onLoginRequest }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const toast = useToast();

    if (!recommendations || recommendations.length === 0) return null;

    const handleSaveClick = () => {
        if (!user) {
            onLoginRequest();
            return;
        }
        setShowSaveModal(true);
    };

    const confirmSavePlaylist = async (name) => {
        setIsSaving(true);
        try {
            await createPlaylist(name, recommendations);
            toast.success("Playlist saved successfully!");
        } catch (error) {
            toast.error("Failed to save playlist.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <InputModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onConfirm={confirmSavePlaylist}
                title="Name your Playlist"
                defaultValue={`My ${moods[0] || 'Awesome'} Mix`}
                placeholder="Enter playlist name..."
                confirmText={isSaving ? "Saving..." : "Save Playlist"}
            />

            {moods && moods.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        marginBottom: '2rem',
                        padding: '1rem',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '16px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <p style={{ margin: 0, color: '#c4b5fd' }}>
                        Vibe detected: <span style={{ fontWeight: 'bold', color: 'white' }}>{moods.join(', ')}</span>
                    </p>

                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        <FaSave /> {isSaving ? 'Saving...' : 'Save Playlist'}
                    </button>
                </motion.div>
            )}

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                style={{ display: 'grid', gap: '1rem' }}
            >
                {recommendations.map((song, idx) => (
                    <SongCard key={idx} song={song} index={idx} />
                ))}
            </motion.div>
        </div>
    );
};

export default SongList;
