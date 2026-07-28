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
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_")) {
            // If Client ID is missing, open Drive window
            const width = 850;
            const height = 650;
            const left = Math.max(0, (window.screen.width - width) / 2);
            const top = Math.max(0, (window.screen.height - height) / 2);
            window.open(
                'https://drive.google.com',
                'GoogleDrivePopup',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
            );
            return;
        }

        setPickerLoading(true);

        const loadScriptsAndPick = () => {
            // Load GIS script if not present
            if (!window.google?.accounts?.oauth2) {
                const gisScript = document.createElement("script");
                gisScript.src = "https://accounts.google.com/gsi/client";
                gisScript.onload = () => loadGapiScript();
                gisScript.onerror = () => handlePickerFallback();
                document.body.appendChild(gisScript);
            } else {
                loadGapiScript();
            }
        };

        const loadGapiScript = () => {
            if (!window.gapi) {
                const gapiScript = document.createElement("script");
                gapiScript.src = "https://apis.google.com/js/api.js";
                gapiScript.onload = () => {
                    window.gapi.load("picker", requestAuthToken);
                };
                gapiScript.onerror = () => handlePickerFallback();
                document.body.appendChild(gapiScript);
            } else {
                window.gapi.load("picker", requestAuthToken);
            }
        };

        const requestAuthToken = () => {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
                    callback: (response) => {
                        if (response.access_token) {
                            showGoogleDrivePicker(response.access_token);
                        } else {
                            console.error("Google Auth token error:", response);
                            setPickerLoading(false);
                            handlePickerFallback();
                        }
                    }
                });
                client.requestAccessToken({ prompt: "" });
            } catch (err) {
                console.error("Token client error:", err);
                setPickerLoading(false);
                handlePickerFallback();
            }
        };

        const showGoogleDrivePicker = (accessToken) => {
            setPickerLoading(false);
            try {
                const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
                    .setIncludeFolders(true)
                    .setSelectFolderEnabled(false);

                const picker = new window.google.picker.PickerBuilder()
                    .addView(view)
                    .setOAuthToken(accessToken)
                    .setDeveloperKey(GOOGLE_API_KEY)
                    .setCallback(async (data) => {
                        if (data.action === window.google.picker.Action.PICKED) {
                            const doc = data.docs[0];
                            if (doc) {
                                const fileUrl = doc.url || `https://drive.google.com/file/d/${doc.id}/view`;
                                if (onAddDriveLink) {
                                    await onAddDriveLink(fileUrl);
                                }
                                setActiveView('main');
                            }
                        }
                    })
                    .build();
                picker.setVisible(true);
            } catch (err) {
                console.error("Google Picker build error:", err);
                handlePickerFallback();
            }
        };

        const handlePickerFallback = () => {
            setPickerLoading(false);
            window.open('https://drive.google.com', '_blank');
        };

        loadScriptsAndPick();
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
                                <p>Click below to select any file directly from your Google Drive:</p>

                                <div style={{ margin: '18px 0' }}>
                                    <button
                                        type="button"
                                        className="submit-btn"
                                        onClick={openGoogleDrivePicker}
                                        disabled={pickerLoading}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '0.95rem' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                                            {pickerLoading ? 'sync' : 'add_to_drive'}
                                        </span>
                                        {pickerLoading ? 'Loading Google Drive...' : 'Select File from Google Drive'}
                                    </button>
                                </div>

                                <div className="source-form-actions" style={{ marginTop: '24px' }}>
                                    <button type="button" className="cancel-btn" onClick={() => setActiveView('main')}>Back</button>
                                </div>
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
