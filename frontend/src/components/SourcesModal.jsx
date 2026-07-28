import React, { useState, useRef } from 'react';
import './SourcesModal.css';

const SourcesModal = ({
    isOpen,
    onClose,
    onFileUpload,
    isUploading = false,
    sources = [],
    onAddWebsite,
    onAddTextNote,
    onDeleteSource,
    isParsing = false
}) => {
    const fileInputRef = useRef();
    const [activeView, setActiveView] = useState('main'); // 'main' | 'website' | 'text' | 'drive'
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [copiedText, setCopiedText] = useState('');
    const [textTitle, setTextTitle] = useState('');
    const [driveUrl, setDriveUrl] = useState('');

    // Google Drive API Credentials State
    const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google_client_id') || '');
    const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem('google_api_key') || '');
    const [savedMsg, setSavedMsg] = useState('');

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

    const handleSaveGoogleCredentials = (e) => {
        e.preventDefault();
        localStorage.setItem('google_client_id', googleClientId.trim());
        localStorage.setItem('google_api_key', googleApiKey.trim());
        setSavedMsg('Credentials saved successfully!');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleLaunchDrivePicker = () => {
        if (!googleClientId.trim() || !googleApiKey.trim()) {
            alert("Please enter and save your Google Client ID and API Key below first.");
            return;
        }
        // Launch Google Picker API or open Google Drive window
        window.open(`https://drive.google.com`, '_blank');
    };

    const handleAddWebsiteSubmit = async (e) => {
        e.preventDefault();
        if (!websiteUrl.trim()) return;
        if (onAddWebsite) {
            await onAddWebsite(websiteUrl.trim());
        }
        setWebsiteUrl('');
        setActiveView('main');
    };

    const handleAddTextSubmit = (e) => {
        e.preventDefault();
        if (!copiedText.trim()) return;
        if (onAddTextNote) {
            onAddTextNote(textTitle.trim() || 'Copied Note', copiedText.trim());
        }
        setCopiedText('');
        setTextTitle('');
        setActiveView('main');
    };

    const handleAddDriveSubmit = (e) => {
        e.preventDefault();
        if (!driveUrl.trim()) return;
        if (onAddWebsite) {
            onAddWebsite(driveUrl.trim());
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
                            className={`source-option-btn ${activeView === 'website' ? 'active' : ''}`}
                            onClick={() => setActiveView('website')}
                        >
                            <span className="material-symbols-outlined icon">language</span>
                            <span>Add websites</span>
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
                        {activeView === 'website' ? (
                            <form className="source-form-view" onSubmit={handleAddWebsiteSubmit}>
                                <h3>Add Website Source</h3>
                                <p>Enter a public website URL for Morepen AI to parse and reference:</p>
                                <input
                                    type="url"
                                    className="source-input"
                                    placeholder="https://example.com/article"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    required
                                    autoFocus
                                    disabled={isParsing}
                                />
                                <div className="source-form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')} disabled={isParsing}>Cancel</button>
                                    <button type="submit" className="submit-btn" disabled={isParsing}>
                                        {isParsing ? 'Parsing website...' : 'Add Website'}
                                    </button>
                                </div>
                            </form>
                        ) : activeView === 'text' ? (
                            <form className="source-form-view" onSubmit={handleAddTextSubmit}>
                                <h3>Add Copied Text / Note</h3>
                                <p>Paste notes or raw text directly into your notebook:</p>
                                <input
                                    type="text"
                                    className="source-input"
                                    placeholder="Title (optional)"
                                    value={textTitle}
                                    onChange={(e) => setTextTitle(e.target.value)}
                                />
                                <textarea
                                    className="source-textarea"
                                    placeholder="Paste your text content here..."
                                    value={copiedText}
                                    onChange={(e) => setCopiedText(e.target.value)}
                                    rows={6}
                                    required
                                />
                                <div className="source-form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Cancel</button>
                                    <button type="submit" className="submit-btn">Save Note</button>
                                </div>
                            </form>
                        ) : activeView === 'drive' ? (
                            <div className="source-form-view">
                                <h3>Google Drive Integration</h3>
                                <p>Enter your Google Cloud credentials (Client ID & Secret Key) to connect Google Drive:</p>

                                <form onSubmit={handleSaveGoogleCredentials} className="drive-creds-form">
                                    <label className="drive-label">Google Client ID:</label>
                                    <input
                                        type="text"
                                        className="source-input"
                                        placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
                                        value={googleClientId}
                                        onChange={(e) => setGoogleClientId(e.target.value)}
                                    />

                                    <label className="drive-label" style={{ marginTop: '8px' }}>Google API Key / Secret Key:</label>
                                    <input
                                        type="password"
                                        className="source-input"
                                        placeholder="AIzaSy..."
                                        value={googleApiKey}
                                        onChange={(e) => setGoogleApiKey(e.target.value)}
                                    />

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                                        <button type="submit" className="submit-btn" style={{ padding: '6px 14px' }}>
                                            Save Credentials
                                        </button>
                                        {savedMsg && <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: '600' }}>{savedMsg}</span>}
                                    </div>
                                </form>

                                <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />

                                <form onSubmit={handleAddDriveSubmit} className="drive-picker-section">
                                    <p style={{ fontWeight: '500', color: '#2c2c2c' }}>Or paste a Google Drive file link directly:</p>
                                    <input
                                        type="url"
                                        className="source-input"
                                        placeholder="https://drive.google.com/file/d/..."
                                        value={driveUrl}
                                        onChange={(e) => setDriveUrl(e.target.value)}
                                        required
                                    />

                                    <div className="source-form-actions">
                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            onClick={handleLaunchDrivePicker}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f4f0ff', color: '#6D4FC2', border: '1px solid #d6c7ff' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                            Launch Drive
                                        </button>
                                        <button type="submit" className="submit-btn">Add Drive Link</button>
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
                                                        {type === 'website' ? 'language' : type === 'note' ? 'description' : 'insert_drive_file'}
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
