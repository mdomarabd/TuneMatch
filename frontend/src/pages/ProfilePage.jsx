import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUserCircle, FaEdit, FaSave, FaCamera, FaArrowLeft, FaMusic, FaTrash, FaObjectGroup, FaSpotify, FaCalendarAlt, FaChevronDown, FaChevronUp, FaKey, FaTimes, FaCheck, FaSignOutAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import InputModal from '../components/InputModal';
import { getMe, updateProfile, getUserPlaylists, deletePlaylist, combinePlaylists, renamePlaylist, changePassword, getSpotifyAuthUrl, exportToSpotify, removeSongFromPlaylist } from '../api';

import { useToast } from '../contexts/ToastContext';

// ... existing imports

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const toast = useToast();
    // ... other states
    const [playlists, setPlaylists] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Playlist Management State (Reused logic)
    const [expandedId, setExpandedId] = useState(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Password Change State
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Input Modal State
    const [inputModal, setInputModal] = useState({ isOpen: false, title: '', defaultValue: '', onConfirm: null });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const userData = await getMe();
            setUser(userData);
            setEditName(userData.full_name);

            const playlistData = await getUserPlaylists();
            setPlaylists(playlistData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (error) {
            console.error("Failed to load profile", error);
            toast.error("Failed to load profile data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result;
            try {
                const updated = await updateProfile({ avatar: base64 });
                setUser(updated);
                toast.success("Avatar updated!");
            } catch (error) {
                toast.error("Failed to update avatar. Image might be too large.");
                console.error(error);
            }
        };
    };

    const handleSaveProfile = async () => {
        try {
            const updated = await updateProfile({ full_name: editName });
            setUser(updated);
            setIsEditing(false);
            toast.success("Profile updated");
        } catch (error) {
            toast.error("Failed to update profile");
        }
    };

    // Playlist Logic
    const toggleExpand = (id) => !isSelectionMode && setExpandedId(expandedId === id ? null : id);

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
                    toast.success("Playlist deleted");
                } catch (error) {
                    console.error("Delete error:", error);
                    toast.error("Failed to delete");
                }
            }
        });
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleRename = async (e, id) => {
        e.stopPropagation();
        if (!renameValue.trim()) return;
        try {
            await renamePlaylist(id, renameValue);
            setPlaylists(playlists.map(p => p.id === id ? { ...p, name: renameValue } : p));
            setRenamingId(null);
            setRenameValue('');
            toast.success("Renamed successfully");
        } catch (error) { toast.error("Failed to rename"); }
    };

    const startRename = (e, id, currentName) => {
        e.stopPropagation();
        setRenamingId(id);
        setRenameValue(currentName);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords don't match!");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        try {
            await changePassword(currentPassword, newPassword);
            toast.success("Password changed successfully!");
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to change password");
        }
    };

    const handleLogout = () => {
        setInputModal({
            isOpen: true,
            title: "Are you sure you want to logout?",
            showInput: false,
            confirmText: 'Logout',
            cancelText: 'Cancel',
            onConfirm: () => {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
        });
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
                        setPlaylists([result, ...playlists.filter(p => !selectedIds.has(p.id))]);
                    } else {
                        setPlaylists([result, ...playlists]);
                    }

                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                    toast.success("Combined successfully!");
                } catch (error) { toast.error("Combine failed"); } finally { setIsLoading(false); }
            }
        });
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

    const handleRemoveSong = async (e, playlistId, songIndex, songName) => {
        e.stopPropagation();
        if (!confirm(`Remove "${songName}" from this playlist?`)) return;

        try {
            await removeSongFromPlaylist(playlistId, songIndex);

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
            toast.success("Song removed");
        } catch (error) {
            console.error("Delete song error:", error);
            toast.error(`Failed to remove song: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleSpotifyExport = async (e, playlistId, playlistName) => {
        e.stopPropagation();
        if (!confirm(`Export "${playlistName}" to Spotify?`)) return;

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
                    if (confirm("Export successful! Popup was blocked. Open Spotify now?")) {
                        window.open(result.spotify_url, '_blank');
                    }
                }
            } else if (newWindow) {
                newWindow.close();
                toast.info(result.message);
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
                toast.error(error.response?.data?.detail || "Failed to export");
            }
        }
    };

    if (isLoading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Profile...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
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
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    color: '#a0a0a0', textDecoration: 'none', fontSize: '1.1rem',
                    marginBottom: '1rem'
                }}>
                    <FaArrowLeft /> Back to Home
                </Link>
                <div style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem',
                    display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden',
                            border: '4px solid #8b5cf6', background: '#1a1a2e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <FaUserCircle size={80} color="rgba(255,255,255,0.2)" />
                            )}
                        </div>
                        <label style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: '#8b5cf6', color: 'white', width: '36px', height: '36px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', border: '3px solid #1a1a2e'
                        }}>
                            <FaCamera size={14} />
                            <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                        </label>
                    </div>

                    {/* Check name */}
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {isEditing ? (
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid #8b5cf6',
                                        color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '1.5rem',
                                        width: '100%'
                                    }}
                                />
                            ) : (
                                <h1 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>{user.full_name}</h1>
                            )}

                            <button
                                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                                style={{
                                    background: isEditing ? '#10b981' : 'rgba(255,255,255,0.1)',
                                    border: 'none', borderRadius: '8px', width: '40px', height: '40px',
                                    color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {isEditing ? <FaSave /> : <FaEdit />}
                            </button>
                        </div>
                        <div style={{ color: '#a0a0a0' }}>{user.email}</div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.4rem 1rem', borderRadius: '20px', color: '#c4b5fd', fontSize: '0.9rem' }}>
                                🎵 {playlists.length} Playlists
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '20px', color: '#a0a0a0', fontSize: '0.9rem' }}>
                                📅 Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            alignSelf: 'flex-start' // Align to top
                        }}
                    >
                        <FaSignOutAlt size={20} />
                    </button>
                </div>
            </div>

            {/* Password Change Section */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', padding: '1rem', color: 'white', cursor: 'pointer',
                        gap: '0.5rem', width: '100%', fontSize: '1rem'
                    }}
                >
                    <FaKey color="#8b5cf6" style={{ marginRight: '0.3rem' }} /> Change Password
                </button>

                {showPasswordForm && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onSubmit={handlePasswordChange}
                        style={{
                            marginTop: '1rem', background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                style={{
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', padding: '0.75rem', borderRadius: '8px'
                                }}
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', padding: '0.75rem', borderRadius: '8px'
                                }}
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', padding: '0.75rem', borderRadius: '8px'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1, background: '#10b981', border: 'none', borderRadius: '8px',
                                        padding: '0.75rem', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    Update Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordForm(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                                        padding: '0.75rem', color: 'white', cursor: 'pointer'
                                    }}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
            </div>

            {/* Playlists */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: 'white', margin: 0 }}>My Collection</h2>
                    <button
                        onClick={handleConnect}
                        style={{
                            background: user?.is_spotify_connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(29, 185, 84, 0.1)',
                            border: `1px solid ${user?.is_spotify_connected ? '#10b981' : 'rgba(29, 185, 84, 0.3)'}`,
                            borderRadius: '12px',
                            padding: '0.6rem 1.2rem',
                            color: user?.is_spotify_connected ? '#10b981' : '#1DB954',
                            cursor: user?.is_spotify_connected ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginRight: '1rem'
                        }}
                    >
                        {user?.is_spotify_connected ? <FaCheck /> : <FaSpotify />}
                        {user?.is_spotify_connected ? 'Connected' : 'Connect'}
                    </button>

                    {playlists.length > 1 && (
                        <button
                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                            style={{
                                background: isSelectionMode ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px',
                                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <FaObjectGroup /> {isSelectionMode ? 'Done' : 'Combine'}
                        </button>
                    )}
                </div>
            </div>


            {isSelectionMode && selectedIds.size >= 2 && (
                <motion.button
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    onClick={handleCombine}
                    style={{
                        width: '100%', background: '#8b5cf6', color: 'white', border: 'none',
                        padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    Merge {selectedIds.size} Playlists
                </motion.button>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
                {playlists.map(playlist => (
                    <motion.div
                        key={playlist.id}
                        layout
                        onClick={() => isSelectionMode ? toggleSelection(playlist.id) : toggleExpand(playlist.id)}
                        style={{
                            background: (expandedId === playlist.id || selectedIds.has(playlist.id)) ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                            border: selectedIds.has(playlist.id) ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '16px', padding: '1rem', cursor: 'pointer',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '6px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        background: selectedIds.has(playlist.id) ? '#8b5cf6' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                    }}>
                                        {selectedIds.has(playlist.id) && '✓'}
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    {renamingId === playlist.id ? (
                                        <input
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(e, playlist.id);
                                                if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                                            }}
                                            style={{
                                                background: 'rgba(0,0,0,0.3)', border: '1px solid #8b5cf6',
                                                color: 'white', padding: '0.5rem', borderRadius: '8px',
                                                fontSize: '1.1rem', width: '100%'
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <h3 style={{ margin: '0 0 0.2rem 0', color: 'white' }}>{playlist.name}</h3>
                                            <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>{playlist.songs.length} songs • {new Date(playlist.created_at).toLocaleDateString()}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {!isSelectionMode && renamingId !== playlist.id && (
                                    <>
                                        <button
                                            onClick={(e) => startRename(e, playlist.id, playlist.name)}
                                            style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer' }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={(e) => handleSpotifyExport(e, playlist.id, playlist.name)}
                                            style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#1DB954', cursor: 'pointer' }}
                                            title="Export to Spotify"
                                        >
                                            <FaSpotify />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, playlist.id, playlist.name)}
                                            style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                                {renamingId === playlist.id && (
                                    <button
                                        onClick={(e) => handleRename(e, playlist.id)}
                                        style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                                    >
                                        <FaSave />
                                    </button>
                                )}
                                {!isSelectionMode && (
                                    <div style={{ padding: '0.5rem', color: '#a0a0a0' }}>
                                        {expandedId === playlist.id ? <FaChevronUp /> : <FaChevronDown />}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Expanded Songs */}
                        {expandedId === playlist.id && !isSelectionMode && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                {playlist.songs.map((song, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#e0e0e0', fontSize: '0.9rem' }}>
                                        <span><strong style={{ color: 'white' }}>{song.track}</strong> - {song.artist}</span>
                                        <div>
                                            {song.spotify_url && <a href={song.spotify_url} target="_blank" rel="noreferrer" style={{ color: '#1DB954', marginRight: '1rem' }}><FaSpotify size={18} /></a>}
                                            <button
                                                onClick={(e) => handleRemoveSong(e, playlist.id, idx, song.track)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}
                                                onMouseOver={(e) => e.target.style.opacity = 1}
                                                onMouseOut={(e) => e.target.style.opacity = 0.5}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ProfilePage;
