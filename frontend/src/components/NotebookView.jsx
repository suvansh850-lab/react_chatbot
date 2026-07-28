import { useRef, useState } from 'react';
import './NotebookView.css';

const NotebookView = ({
    notebook,
    onRenameNotebook,
    onFileUpload,
    chats = [],
    onSelectChat,
    onSendPrompt,
    selectedModel,
    setSelectedModel,
    isUploading = false,
    setIsVoiceOpen
}) => {
    const fileInputRef = useRef();
    const inputRef = useRef();
    const [modelOpen, setModelOpen] = useState(false);

    const MODELS = [
        { label: 'Groq', value: 'groq/llama-3.3-70b-versatile' },
        { label: 'Gemini', value: 'gemini/gemini-2.5-flash' },
    ];

    const currentModelLabel = MODELS.find(m => m.value === selectedModel)?.label || 'Groq';

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const text = inputRef.current?.value.trim();
        if (!text) return;
        inputRef.current.value = "";
        if (onSendPrompt) {
            onSendPrompt(text);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) {
            onFileUpload(file);
        }
        e.target.value = "";
    };

    // Get chats that belong to this notebook
    const notebookChats = chats.filter(c => c.notebookId === notebook.id);

    return (
        <div className="notebook-view-container">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                disabled={isUploading}
            />

            {/* Top header row */}
            <div className="notebook-header-row">
                <div className="notebook-title-section">
                    <span className="notebook-emoji-icon">📓</span>
                    <input
                        type="text"
                        className="notebook-title-input"
                        value={notebook.title}
                        onChange={(e) => onRenameNotebook(notebook.id, e.target.value)}
                        placeholder="Untitled notebook"
                    />
                </div>
                <button
                    type="button"
                    className="add-sources-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {isUploading ? 'sync' : 'add'}
                    </span>
                    {isUploading ? 'Uploading...' : 'Add sources'}
                </button>
            </div>

            {/* Center Prompt Bar */}
            <form className="notebook-prompt-bar" onSubmit={handleFormSubmit}>
                <button
                    type="button"
                    className="attach-icon-btn material-symbols-outlined"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add sources"
                    disabled={isUploading}
                >
                    add
                </button>

                <input
                    type="text"
                    ref={inputRef}
                    className="notebook-prompt-input"
                    placeholder="Ask Morepen AI"
                    required
                />

                {/* Model Selector */}
                <div className="inline-model-selector" style={{ marginRight: '8px' }}>
                    <button
                        type="button"
                        className="model-pill-btn"
                        onClick={() => setModelOpen(o => !o)}
                    >
                        <span>{currentModelLabel}</span>
                        <span className="material-symbols-outlined model-pill-arrow">
                            {modelOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </button>

                    {modelOpen && (
                        <div className="model-dropdown">
                            {MODELS.map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    className={`model-dropdown-item ${selectedModel === m.value ? 'active' : ''}`}
                                    onClick={() => { setSelectedModel(m.value); setModelOpen(false); }}
                                >
                                    {m.label}
                                    {selectedModel === m.value && (
                                        <span className="material-symbols-outlined model-check">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mic Icon */}
                <button
                    type="button"
                    className="attach-icon-btn material-symbols-outlined"
                    onClick={() => setIsVoiceOpen && setIsVoiceOpen(true)}
                    title="Voice assistant"
                >
                    mic
                </button>
            </form>

            {/* Past Chats Section */}
            <div className="past-chats-section">
                <h3 className="past-chats-title">Past chats</h3>

                {notebookChats.length === 0 ? (
                    <div className="empty-past-chats">
                        No past chats in this notebook yet. Start by asking a question above!
                    </div>
                ) : (
                    notebookChats.map((chat) => (
                        <div
                            key={chat.id}
                            className="past-chat-row"
                            onClick={() => onSelectChat(chat.id)}
                        >
                            <span className="past-chat-name">{chat.title}</span>
                            <span className="past-chat-date">Today</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotebookView;
