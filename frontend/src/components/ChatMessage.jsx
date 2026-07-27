import { useState } from 'react';
import ChatBotIcon from './ChatBotIcon';

const ChatMessage = ({ chat }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        if (!chat.text || chat.text === "Thinking...") return;
        try {
            await navigator.clipboard.writeText(chat.text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    };

    // Helper to get readable file size
    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        !chat.hideInChat && (
            <div className={`message ${chat.role === "model" ? "bot" : "user"}-message`}>
                {chat.role === "model" && <ChatBotIcon />}
                <div className="message-content">
                    {chat.fileCard ? (
                        <div className="file-card-bubble">
                            <div className="file-card-icon-container">
                                <span className="material-symbols-outlined file-card-icon">
                                    {chat.fileCard.fileType?.includes("image") ? "image" : "description"}
                                </span>
                            </div>
                            <div className="file-card-details">
                                <span className="file-card-name" title={chat.fileCard.fileName}>
                                    {chat.fileCard.fileName}
                                </span>
                                {chat.fileCard.fileSize && (
                                    <span className="file-card-meta">
                                        {formatBytes(chat.fileCard.fileSize)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="message-text">{chat.text}</p>
                    )}
                    {chat.role === "model" && chat.text !== "Thinking..." && !chat.fileCard && (
                        <button
                            type="button"
                            className={`copy-message-btn material-symbols-outlined ${isCopied ? "copied" : ""}`}
                            onClick={handleCopy}
                            title={isCopied ? "Copied!" : "Copy answer"}
                            aria-label={isCopied ? "Copied to clipboard" : "Copy answer"}
                        >
                            {isCopied ? "check" : "content_copy"}
                        </button>
                    )}
                </div>
            </div>
        )
    );
};

export default ChatMessage;