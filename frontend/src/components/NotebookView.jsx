import { useRef, useState } from 'react';
import SourcesModal from './SourcesModal';
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
    setIsVoiceOpen,
    onAddSource,
    onDeleteSource
}) => {
    const inputRef = useRef();
    const [modelOpen, setModelOpen] = useState(false);
    const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);

    const MODELS = [
        { label: 'Groq (Cloud: Llama 3.3)', value: 'groq/llama-3.3-70b-versatile' },
        { label: 'Gemini (Cloud: Gemini 2.5)', value: 'gemini/gemini-2.5-flash' },
        { label: 'Ollama (Offline: Llama 3.2)', value: 'ollama/llama3.2' },
        { label: 'Ollama (Offline: DeepSeek R1)', value: 'ollama/deepseek-r1' },
        { label: 'Ollama (Offline: Mistral)', value: 'ollama/mistral' },
    ];

    const currentModelLabel = MODELS.find(m => m.value === selectedModel)?.label || 'Groq';
    const sources = notebook?.sources || [];

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const text = inputRef.current?.value.trim();
        if (!text) return;
        inputRef.current.value = "";
        if (onSendPrompt) {
            onSendPrompt(text);
        }
    };


    const handleSourceFileUpload = (file) => {
        if (onFileUpload) {
            onFileUpload(file);
        }

        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                let textContent = e.target.result || "";
                textContent = textContent.replace(/\0/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
                if (onAddSource) {
                    onAddSource({ id: Date.now(), name: file.name, type: 'file', content: textContent });
                }
            };
            reader.readAsText(file);
        } else {
            if (onAddSource) {
                onAddSource({ id: Date.now(), name: file.name, type: 'file', content: `Uploaded document: ${file.name}` });
            }
        }
    };

    const handleAddTextNote = (title, text) => {
        if (onAddSource) {
            onAddSource({ id: Date.now(), name: title || 'Note', type: 'note', content: text });
        }
    };

    const handleAddDriveLink = async (link) => {
        try {
            const getBackendRoot = () => {
                if (import.meta.env.VITE_API_URL) {
                    return import.meta.env.VITE_API_URL.replace(/\/$/, '').replace(/\/api$/, '') + '/api/chat';
                }
                return `${window.location.origin}/api/chat`;
            };

            const backendUrl = `${getBackendRoot()}/parse-google-drive`;
            const res = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: link })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (onAddSource) {
                    onAddSource({
                        id: Date.now(),
                        name: data.fileName || link,
                        type: 'file',
                        content: `Google Drive Document Content:\n${data.text}`
                    });
                }
            } else {
                alert(data.error || "Failed to import Google Drive file. Make sure file permission is set to 'Anyone with the link can view'.");
            }
        } catch (err) {
            console.error("Google Drive import error:", err);
            alert("Error importing Google Drive file: " + err.message);
        }
    };

    const handleDeleteSource = (index) => {
        if (onDeleteSource) {
            onDeleteSource(index);
        }
    };

    // Get chats that belong to this notebook
    const notebookChats = chats.filter(c => c.notebookId === notebook.id);

    return (
        <div className="notebook-view-container">
            {/* Sources Modal */}
            <SourcesModal
                isOpen={isSourcesModalOpen}
                onClose={() => setIsSourcesModalOpen(false)}
                onFileUpload={handleSourceFileUpload}
                isUploading={isUploading}
                sources={sources}
                onAddTextNote={handleAddTextNote}
                onDeleteSource={handleDeleteSource}
                onAddDriveLink={handleAddDriveLink}
            />

            {/* Top header row */}
            <div className="notebook-header-row">
                <div className="notebook-title-section">
                    <input
                        type="text"
                        className="notebook-title-input"
                        value={notebook.title}
                        onChange={(e) => onRenameNotebook(notebook.id, e.target.value)}
                        placeholder="Untitled notebook"
                    />

                    {/* Active Sources Badges */}
                    {sources.length > 0 && (
                        <div className="notebook-sources-badge-list">
                            <span className="sources-count-label">📑 {sources.length} Source{sources.length > 1 ? 's' : ''}:</span>
                            {sources.map((src, i) => (
                                <span key={i} className="notebook-source-chip" title={src.name}>
                                    {src.type === 'note' ? '📝' : src.type === 'website' ? '🌐' : '📄'} {src.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    className="add-sources-btn"
                    onClick={() => setIsSourcesModalOpen(true)}
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
                    onClick={() => setIsSourcesModalOpen(true)}
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
