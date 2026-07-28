import React, { useState, useRef } from 'react';
import './SourcesModal.css';

// ── Google Drive API Credentials ──────────────────────────────
// Read from environment variables (never hardcode secrets in source files)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

const SourcesModal = ({
    isOpen,
    onClose,
    onFileUpload,
    isUploading = false,
    sources = [],
    onAddTextNote,
    onDeleteSource,
    onAddDriveLink
}) => {
    const fileInputRef = useRef();
    const [activeView, setActiveView] = useState('main'); // 'main' | 'text' | 'drive'
    const [copiedText, setCopiedText] = useState('');
    const [driveUrl, setDriveUrl] = useState('');
    const [pickerLoading, setPickerLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) {
            onFileUpload(file);
        }
        e.target.value = "";
    };

    const handleDriveOptionClick = () => {
        setActiveView('drive');
    };

    const openGoogleDrivePicker = () => {
        const width = 850;
        const height = 650;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);
        window.open(
            'https://drive.google.com',
            'GoogleDrivePopup',
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );
    };

    const handleAddTextSubmit = (e) => {
        e.preventDefault();
        const text = copiedText.trim();
        if (!text) return;
        const autoTitle = text.split('\n')[0].substring(0, 30) || 'Copied Note';
        if (onAddTextNote) {
            onAddTextNote(autoTitle, text);
        }
        setCopiedText('');
        setActiveView('main');
    };

    const handleAddDriveSubmit = (e) => {
        e.preventDefault();
        if (!driveUrl.trim()) return;
        if (onAddDriveLink) {
            onAddDriveLink(driveUrl.trim());
        }
        setDriveUrl('');
        setActiveView('main');
    };

    return (
        <div className="sources-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="sources-modal">
                {/* Header */}
                <div className="sources-modal-header">
                    <div>
                        <h2>Sources</h2>
                        <p className="sources-subtitle">Add files that Morepen AI can reference in your notebook</p>
                    </div>
                    <button className="sources-close-btn material-symbols-outlined" onClick={onClose}>
                        close
                    </button>
                </div>

                {/* Body */}
                <div className="sources-modal-body">
                    {/* Left Sidebar options */}
                    <div className="sources-sidebar">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                            disabled={isUploading}
                        />

                        <button
                            type="button"
                            className="source-option-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            <span className="material-symbols-outlined icon">add</span>
                            <span>{isUploading ? 'Uploading...' : 'Upload files'}</span>
                        </button>

                        <button
                            type="button"
                            className={`source-option-btn ${activeView === 'drive' ? 'active' : ''}`}
                            onClick={handleDriveOptionClick}
                        >
                            <span className="material-symbols-outlined icon drive-icon">add_to_drive</span>
                            <span>Add from Drive</span>
                        </button>

                        <button
                            type="button"
                            className={`source-option-btn ${activeView === 'text' ? 'active' : ''}`}
                            onClick={() => setActiveView('text')}
                        >
                            <span className="material-symbols-outlined icon">content_paste</span>
                            <span>Copied text</span>
                        </button>
                    </div>

                    {/* Right Panel View */}
                    <div className="sources-content-panel">
                        {activeView === 'text' ? (
                            <form className="source-form-view" onSubmit={handleAddTextSubmit}>
                                <h3>Add Copied Text / Note</h3>
                                <p>Paste notes or raw text directly into your notebook:</p>
                                <textarea
                                    className="source-textarea"
                                    placeholder="Paste your text content here..."
                                    value={copiedText}
                                    onChange={(e) => setCopiedText(e.target.value)}
                                    rows={8}
                                    required
                                    autoFocus
                                />
                                <div className="source-form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Cancel</button>
                                    <button type="submit" className="submit-btn">Save Note</button>
                                </div>
                            </form>
                        ) : activeView === 'drive' ? (
                            <div className="source-form-view">
                                <h3>Add from Google Drive</h3>
                                <p>Open Google Drive or paste a shareable Google Drive file link below:</p>

                                <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="submit-btn"
                                        onClick={openGoogleDrivePicker}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', width: 'fit-content' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                            open_in_new
                                        </span>
                                        Open Google Drive Window
                                    </button>

                                    <p style={{ fontSize: '0.82rem', color: '#666666', margin: '0' }}>
                                        💡 <strong>Tip:</strong> In Google Drive, right click your file, select <em>Copy link</em> (ensure access is set to "Anyone with link"), and paste it below.
                                    </p>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />

                                <form onSubmit={handleAddDriveSubmit}>
                                    <p style={{ fontWeight: '500', color: '#2c2c2c', marginBottom: '8px' }}>Paste Google Drive Link:</p>
                                    <input
                                        type="url"
                                        className="source-input"
                                        placeholder="https://drive.google.com/file/d/..."
                                        value={driveUrl}
                                        onChange={(e) => setDriveUrl(e.target.value)}
                                        required
                                    />

                                    <div className="source-form-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Cancel</button>
                                        <button type="submit" className="submit-btn">Import File Content</button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            /* Main Sources List / Empty State */
                            <div className="sources-list-container">
                                {sources.length === 0 ? (
                                    <div className="sources-empty-state">
                                        <span className="material-symbols-outlined empty-icon">folder_open</span>
                                        <p>Documents, images, links and text notes that you add will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="sources-grid">
                                        {sources.map((src, index) => {
                                            const name = typeof src === 'string' ? src : src.name;
                                            const type = typeof src === 'string' ? 'File' : src.type;
                                            return (
                                                <div key={index} className="source-card">
                                                    <span className="material-symbols-outlined source-card-icon">
                                                        {type === 'note' ? 'description' : 'insert_drive_file'}
                                                    </span>
                                                    <div className="source-card-info">
                                                        <span className="source-card-title">{name}</span>
                                                        <span className="source-card-type">{type}</span>
                                                    </div>
                                                    {onDeleteSource && (
                                                        <button
                                                            type="button"
                                                            className="source-delete-btn material-symbols-outlined"
                                                            onClick={() => onDeleteSource(index)}
                                                            title="Remove source"
                                                        >
                                                            delete
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SourcesModal;
