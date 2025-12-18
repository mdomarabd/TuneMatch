import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const Toast = ({ id, message, type, onClose }) => {
    const icons = {
        success: <FaCheckCircle color="#10b981" />,
        error: <FaExclamationCircle color="#ef4444" />,
        info: <FaInfoCircle color="#8b5cf6" />
    };

    const gradientBorders = {
        success: 'linear-gradient(to right, #10b981, #059669)',
        error: 'linear-gradient(to right, #ef4444, #b91c1c)',
        info: 'linear-gradient(to right, #8b5cf6, #6366f1)'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            style={{
                background: 'rgba(26, 26, 46, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderLeft: `4px solid ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#8b5cf6'}`,
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '0.8rem',
                minWidth: '300px',
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                color: 'white',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ fontSize: '1.2rem' }}>{icons[type]}</div>
            <div style={{ flex: 1, fontSize: '0.95rem', lineHeight: '1.4' }}>{message}</div>
            <button
                onClick={() => onClose(id)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a0a0',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <FaTimes />
            </button>
        </motion.div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // Helper functions for cleaner API
    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info')
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'none' // Allow clicking through the container
            }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <AnimatePresence mode="popLayout">
                        {toasts.map((t) => (
                            <Toast key={t.id} {...t} onClose={removeToast} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </ToastContext.Provider>
    );
};
