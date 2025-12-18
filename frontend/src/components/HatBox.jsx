import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaHatWizard, FaMagic, FaListOl } from 'react-icons/fa';

const HatBox = ({ onSearch, isLoading }) => {
    const [text, setText] = useState('');
    const [playlistSize, setPlaylistSize] = useState(10);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSearch(text, playlistSize);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '2rem 0',
            perspective: '1000px'
        }}>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '2rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <FaHatWizard size={48} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>The Magic Hat</h2>
                    <p style={{ color: '#a0a0a0' }}>Drop your thoughts into the hat, and see what song comes out.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="How are you feeling today?"
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'white',
                            fontSize: '1rem',
                            border: '1px solid transparent',
                            transition: 'border-color 0.3s'
                        }}
                        disabled={isLoading}
                    />

                    {/* Playlist Size Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a0a0a0', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FaListOl color="#8b5cf6" />
                                <span>Playlist Size</span>
                            </div>
                            <span style={{ color: '#c4b5fd', fontWeight: 'bold' }}>{playlistSize} songs</span>
                        </div>

                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="5"
                            value={playlistSize}
                            onChange={(e) => setPlaylistSize(Number(e.target.value))}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                height: '6px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '3px',
                                outline: 'none',
                                opacity: '0.7',
                                transition: 'opacity .2s',
                                cursor: 'pointer',
                                accentColor: '#8b5cf6'
                            }}
                            onMouseOver={(e) => e.target.style.opacity = '1'}
                            onMouseOut={(e) => e.target.style.opacity = '0.7'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>
                            <span>5</span>
                            <span>50</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? (
                            <span>Consulting the spirits...</span>
                        ) : (
                            <>
                                <FaMagic /> Cast Spell
                            </>
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default HatBox;
