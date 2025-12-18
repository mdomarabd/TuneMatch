import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const InputModal = ({ isOpen, onClose, onConfirm, title, defaultValue = '', placeholder = '', confirmText = 'Save', cancelText = 'Cancel', showCheckbox = false, checkboxLabel = '', defaultChecked = false, showInput = true }) => {
    const [value, setValue] = useState(defaultValue);
    const [isChecked, setIsChecked] = useState(defaultChecked);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setIsChecked(defaultChecked);
            // Focus input after a small delay to allow animation to start
            if (showInput) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    }, [isOpen, defaultValue, defaultChecked, showInput]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // If showing input, validate it. If not (confirm only), just proceed.
        if (showInput && !value.trim()) return;

        onConfirm(value, isChecked);
        onClose();
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
            zIndex: 2000
        }} onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(26, 26, 46, 0.95)',
                    padding: '2rem',
                    borderRadius: '24px',
                    width: '90%',
                    maxWidth: '400px',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
                    position: 'relative'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer' }}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {showInput && (
                        <input
                            ref={inputRef}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(139, 92, 246, 0.5)',
                                padding: '1rem',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '1.1rem',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />
                    )}

                    {showCheckbox && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.95rem' }}>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                                style={{
                                    accentColor: '#8b5cf6',
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer'
                                }}
                            />
                            {checkboxLabel}
                        </label>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '12px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#a0a0a0',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            disabled={showInput && !value.trim()}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '12px',
                                background: (!showInput || value.trim()) ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)',
                                border: 'none',
                                color: 'white',
                                cursor: (!showInput || value.trim()) ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                boxShadow: (!showInput || value.trim()) ? '0 0 20px rgba(139, 92, 246, 0.4)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default InputModal;
