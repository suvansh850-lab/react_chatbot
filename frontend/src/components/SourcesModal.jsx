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
    onDeleteSource
}) => {
    const fileInputRef = useRef();
    const [activeView, setActiveView] = useState('main'); // 'main' | 'website' | 'text' | 'drive'
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [copiedText, setCopiedText] = useState('');
    const [textTitle, setTextTitle] = useState('');
    const [driveUrl, setDriveUrl] = useState('');

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) {
            onFileUpload(file);
        }
        e.target.value = "";
    };

    const handleAddWebsiteSubmit = (e) => {
        e.preventDefault();
        if (!websiteUrl.trim()) return;
        if (onAddWebsite) {
            onAddWebsite(websiteUrl.trim());
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
                            onClick={() => setActiveView('drive')}
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
                                />
                                <div className="source-form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Cancel</button>
                                    <button type="submit" className="submit-btn">Add Website</button>
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
                            <form className="source-form-view" onSubmit={handleAddDriveSubmit}>
                                <h3>Add Google Drive Link</h3>
                                <p>Paste a shareable Google Drive file link:</p>
                                <input
                                    type="url"
                                    className="source-input"
                                    placeholder="https://drive.google.com/file/d/..."
                                    value={driveUrl}
                                    onChange={(e) => setDriveUrl(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <div className="source-form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Cancel</button>
                                    <button type="submit" className="submit-btn">Add Drive Link</button>
                                </div>
                            </form>
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
