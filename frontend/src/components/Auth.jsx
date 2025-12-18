
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { login, signup, forgotPassword, resetPassword } from '../api';

const Auth = ({ isOpen, onClose, onLoginSuccess }) => {
    const [mode, setMode] = useState('login'); // login, signup, forgot, reset
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        code: '',
        new_password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (mode === 'login') {
                const data = await login(formData.email, formData.password);
                localStorage.setItem('token', data.access_token);
                onLoginSuccess();
                onClose();
            } else if (mode === 'signup') {
                await signup(formData.email, formData.full_name, formData.password);
                setMode('login');
                setSuccessMsg('Account created! Please login.');
            } else if (mode === 'forgot') {
                await forgotPassword(formData.email);
                setMode('reset');
                setSuccessMsg('Code sent to email!');
            } else if (mode === 'reset') {
                await resetPassword(formData.email, formData.code, formData.new_password);
                setMode('login');
                setSuccessMsg('Password reset! Please login.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#1a1a2e',
                    padding: '2rem',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'signup' && 'Join TuneMatch'}
                        {mode === 'forgot' && 'Reset Password'}
                        {mode === 'reset' && 'New Password'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer' }}>
                        <FaTimes size={20} />
                    </button>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                {successMsg && <div style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>{successMsg}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {mode === 'signup' && (
                        <div style={{ position: 'relative' }}>
                            <FaUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a0a0a0' }} />
                            <input
                                name="full_name"
                                placeholder="Full Name"
                                value={formData.full_name}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                            />
                        </div>
                    )}

                    {(mode !== 'reset') && (
                        <div style={{ position: 'relative' }}>
                            <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a0a0a0' }} />
                            <input
                                name="email"
                                type="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                required
                            />
                        </div>
                    )}

                    {(mode === 'login' || mode === 'signup') && (
                        <div style={{ position: 'relative' }}>
                            <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a0a0a0' }} />
                            <input
                                name="password"
                                type="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                required
                            />
                        </div>
                    )}

                    {mode === 'reset' && (
                        <>
                            <input
                                name="code"
                                placeholder="Reset Code"
                                value={formData.code}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                required
                            />
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a0a0a0' }} />
                                <input
                                    name="new_password"
                                    type="password"
                                    placeholder="New Password"
                                    value={formData.new_password}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            color: 'white',
                            fontWeight: '600',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Processing...' : (
                            mode === 'login' ? 'Sign In' :
                                mode === 'signup' ? 'Create Account' :
                                    mode === 'forgot' ? 'Send Reset Code' : 'Reset Password'
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#a0a0a0', fontSize: '0.9rem' }}>
                    {mode === 'login' && (
                        <>
                            Don't have an account? <span onClick={() => setMode('signup')} style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '500' }}>Sign up</span>
                            <br /><br />
                            <span onClick={() => setMode('forgot')} style={{ cursor: 'pointer', fontSize: '0.85rem' }}>Forgot Password?</span>
                        </>
                    )}
                    {mode === 'signup' && (
                        <>
                            Already have an account? <span onClick={() => setMode('login')} style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '500' }}>Sign in</span>
                        </>
                    )}
                    {(mode === 'forgot' || mode === 'reset') && (
                        <span onClick={() => setMode('login')} style={{ color: '#a0a0a0', cursor: 'pointer' }}>Back to Login</span>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
