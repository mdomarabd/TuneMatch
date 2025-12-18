import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic, FaSpotify, FaCheck, FaChevronDown, FaChevronUp, FaCalendarAlt, FaTrash, FaObjectGroup } from 'react-icons/fa';
import { getUserPlaylists, deletePlaylist, combinePlaylists, removeSongFromPlaylist, exportToSpotify, getSpotifyAuthUrl } from '../api';
import InputModal from './InputModal';

const PlaylistModal = ({ isOpen, onClose, user }) => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Input Modal State
    const [inputModal, setInputModal] = useState({ isOpen: false, title: '', defaultValue: '', placeholder: '', onConfirm: null, showCheckbox: false, checkboxLabel: '' });



    useEffect(() => {
        if (isOpen) {
            fetchPlaylists();
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try {
            const data = await getUserPlaylists();
            // Sort by created_at desc (newest first)
            const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setPlaylists(sorted);
        } catch (error) {
            console.error("Failed to fetch playlists", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id) => {
        if (isSelectionMode) return; // Disable expansion via row click in selection mode
        setExpandedId(expandedId === id ? null : id);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const handleDelete = (e, id, name) => {
        e.stopPropagation();

        setInputModal({
            isOpen: true,
            title: `Delete "${name}"?`,
            showInput: false,
            confirmText: 'Delete',
            cancelText: 'No',
            onConfirm: async () => {
                try {
                    await deletePlaylist(id);
                    setPlaylists(current => current.filter(p => p.id !== id));
                    if (selectedIds.has(id)) {
                        setSelectedIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(id);
                            return newSet;
                        });
                    }
                    toast.success("Playlist deleted");
                } catch (error) {
                    console.error("Delete error:", error);
                    toast.error("Failed to delete playlist");
                }
            }
        });
    };

    const handleRemoveSong = async (e, playlistId, songIndex, songName) => {
        e.stopPropagation(); // prevent collapsing
        console.log(`Attempting to remove song: Playlist=${playlistId}, Index=${songIndex}, Name=${songName}`);

        if (!confirm(`Remove "${songName}" from this playlist?`)) return;

        try {
            await removeSongFromPlaylist(playlistId, songIndex);

            // Update local state
            setPlaylists(currentPlaylists =>
                currentPlaylists.map(p => {
                    if (p.id === playlistId) {
                        const newSongs = [...p.songs];
                        newSongs.splice(songIndex, 1);
                        return { ...p, songs: newSongs };
                    }
                    return p;
                })
            );
        } catch (error) {
            console.error("Delete song error:", error);
            alert(`Failed to remove song: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleConnect = async () => {
        if (user?.is_spotify_connected) {
            toast.success("Already connected to Spotify!");
            return;
        }
        try {
            const { auth_url } = await getSpotifyAuthUrl();
            window.location.href = auth_url;
        } catch (error) {
            toast.error("Failed to get auth URL");
        }
    };

    const handleSpotifyExport = async (e, playlistId, playlistName) => {
        e.stopPropagation();
        if (!confirm(`Export "${playlistName}" to Spotify?`)) return;

        // Open window immediately to bypass popup blockers
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write('loading...');
        }

        try {
            const result = await exportToSpotify(playlistId);

            if (result.spotify_url) {
                if (newWindow) {
                    newWindow.location.href = result.spotify_url;
                } else {
                    // Fallback if popup blocked
                    if (confirm("Export successful! Popup was blocked. Open Spotify now?")) {
                        window.open(result.spotify_url, '_blank');
                    }
                }
            } else if (newWindow) {
                newWindow.close();
                alert(result.message);
            }
        } catch (error) {
            if (newWindow) newWindow.close();

            const isAuthError =
                error.response?.status === 401 ||
                error.response?.status === 403 ||
                (error.response?.data?.detail && (
                    error.response.data.detail.includes("not connected") ||
                    error.response.data.detail.includes("session expired")
                ));

            if (isAuthError) {
                if (confirm("Spotify session expired or not connected. Connect now?")) {
                    handleConnect();
                }
            } else {
                alert(error.response?.data?.detail || "Failed to export");
            }
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleCombine = async () => {
        if (selectedIds.size < 2) return;

        setInputModal({
            isOpen: true,
            title: "Name your Mega Mix",
            defaultValue: "My Mega Mix",
            placeholder: "Enter combined playlist name...",
            showCheckbox: true,
            checkboxLabel: "Delete original playlists after combining?",
            onConfirm: async (name, deleteOriginals) => {
                setIsLoading(true);
                try {
                    const result = await combinePlaylists(name, Array.from(selectedIds), deleteOriginals);

                    if (deleteOriginals) {
                        // Remove combined playlists from state
                        setPlaylists(current => [result, ...current.filter(p => !selectedIds.has(p.id))]);
                    } else {
                        setPlaylists(current => [result, ...current]);
                    }

                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                    toast.success("Combined successfully!");
                } catch (error) {
                    console.error("Combine error:", error);
                    toast.error("Combine failed");
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <InputModal
                isOpen={inputModal.isOpen}
                onClose={() => setInputModal({ ...inputModal, isOpen: false })}
                onConfirm={inputModal.onConfirm}
                title={inputModal.title}
                defaultValue={inputModal.defaultValue}
                placeholder={inputModal.placeholder}
                showCheckbox={inputModal.showCheckbox}
                checkboxLabel={inputModal.checkboxLabel}
                showInput={inputModal.showInput === undefined ? true : inputModal.showInput}
                confirmText={inputModal.confirmText || 'Save'}
                cancelText={inputModal.cancelText || 'Cancel'}
            />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#1a1a2e',
                    padding: '2rem',
                    borderRadius: '24px',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ color: 'white', fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaMusic style={{ color: '#8b5cf6' }} /> My Playlists
                        </h2>

                        <button
                            onClick={handleConnect}
                            style={{
                                background: user?.is_spotify_connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(29, 185, 84, 0.1)',
                                border: `1px solid ${user?.is_spotify_connected ? '#10b981' : 'rgba(29, 185, 84, 0.3)'}`,
                                borderRadius: '12px',
                                padding: '0.4rem 0.8rem',
                                color: user?.is_spotify_connected ? '#10b981' : '#1DB954',
                                cursor: user?.is_spotify_connected ? 'default' : 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                marginLeft: '0.5rem'
                            }}
                            title={user?.is_spotify_connected ? "Connected to Spotify" : "Connect Spotify"}
                        >
                            {user?.is_spotify_connected ? <FaCheck /> : <FaSpotify />}
                            {user?.is_spotify_connected ? 'Connected' : 'Connect'}
                        </button>

                        {playlists.length > 1 && (
                            <button
                                onClick={() => setIsSelectionMode(!isSelectionMode)}
                                style={{
                                    background: isSelectionMode ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '12px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                            >
                                <FaObjectGroup /> {isSelectionMode ? 'Cancel Combine' : 'Combine'}
                            </button>
                        )}
                    </div>

                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer' }}>
                        <FaTimes size={24} />
                    </button>
                </div>

                {isSelectionMode && (
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(139, 92, 246, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                        <span style={{ color: '#c4b5fd', fontSize: '0.9rem' }}>{selectedIds.size} selected</span>
                        <button
                            onClick={handleCombine}
                            disabled={selectedIds.size < 2}
                            style={{
                                background: selectedIds.size >= 2 ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                color: selectedIds.size >= 2 ? 'white' : 'rgba(255,255,255,0.3)',
                                border: 'none',
                                padding: '0.4rem 1rem',
                                borderRadius: '8px',
                                cursor: selectedIds.size >= 2 ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}
                        >
                            Merge Selected
                        </button>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {isLoading ? (
                        <div style={{ color: '#a0a0a0', textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : playlists.length === 0 ? (
                        <div style={{ color: '#a0a0a0', textAlign: 'center', padding: '2rem' }}>
                            No playlists yet. Use the Magic Hat to create one! 🎩
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {playlists.map((playlist) => (
                                <div key={playlist.id} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    transition: 'background 0.2s'
                                }}>
                                    <div
                                        onClick={() => isSelectionMode ? toggleSelection(playlist.id) : toggleExpand(playlist.id)}
                                        style={{
                                            padding: '1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: (expandedId === playlist.id || selectedIds.has(playlist.id)) ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {isSelectionMode && (
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    border: selectedIds.has(playlist.id) ? 'none' : '2px solid rgba(255,255,255,0.3)',
                                                    background: selectedIds.has(playlist.id) ? '#8b5cf6' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {selectedIds.has(playlist.id) && '✓'}
                                                </div>
                                            )}

                                            <div>
                                                <h3 style={{ margin: '0 0 0.3rem 0', color: 'white', fontSize: '1.1rem' }}>{playlist.name}</h3>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#a0a0a0' }}>
                                                    <span style={{
                                                        background: 'rgba(139, 92, 246, 0.2)',
                                                        padding: '0.1rem 0.5rem',
                                                        borderRadius: '10px',
                                                        color: '#c4b5fd'
                                                    }}>
                                                        {playlist.songs.length} songs
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <FaCalendarAlt size={12} /> {formatDate(playlist.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {!isSelectionMode && (
                                                <>
                                                    <button
                                                        onClick={(e) => handleSpotifyExport(e, playlist.id, playlist.name)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#1DB954',
                                                            opacity: 0.6,
                                                            cursor: 'pointer',
                                                            padding: '0.5rem',
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                        title="Export to Spotify"
                                                        onMouseOver={(e) => e.target.style.opacity = 1}
                                                        onMouseOut={(e) => e.target.style.opacity = 0.6}
                                                    >
                                                        <FaSpotify size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, playlist.id, playlist.name)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            opacity: 0.6,
                                                            cursor: 'pointer',
                                                            padding: '0.5rem',
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                        title="Delete Playlist"
                                                        onMouseOver={(e) => e.target.style.opacity = 1}
                                                        onMouseOut={(e) => e.target.style.opacity = 0.6}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </>
                                            )}

                                            <div style={{ color: '#a0a0a0' }}>
                                                {expandedId === playlist.id ? <FaChevronUp /> : <FaChevronDown />}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedId === playlist.id && !isSelectionMode && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {playlist.songs.map((song, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.8rem 0',
                                                            borderBottom: idx === playlist.songs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                                        }}>
                                                            <div style={{ width: '80%' }}>
                                                                <div style={{ color: 'white', fontSize: '0.95rem', marginBottom: '0.1rem' }}>{song.track}</div>
                                                                <div style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>{song.artist}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                                {song.spotify_url && (
                                                                    <a
                                                                        href={song.spotify_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#1DB954', fontSize: '1.2rem' }}
                                                                    >
                                                                        <FaSpotify />
                                                                    </a>
                                                                )}
                                                                <button
                                                                    onClick={(e) => handleRemoveSong(e, playlist.id, idx, song.track)}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        opacity: 0.5,
                                                                        cursor: 'pointer',
                                                                        padding: '0.2rem',
                                                                        fontSize: '0.9rem'
                                                                    }}
                                                                    title="Remove song"
                                                                    onMouseOver={(e) => e.target.style.opacity = 1}
                                                                    onMouseOut={(e) => e.target.style.opacity = 0.5}
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default PlaylistModal;
