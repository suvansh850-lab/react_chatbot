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

    return (
        !chat.hideInChat && (
            <div className={`message ${chat.role === "model" ? "bot" : "user"}-message`}>
                {chat.role === "model" && <ChatBotIcon />}
                <div className="message-content">
                    <p className="message-text">{chat.text}</p>
                    {chat.role === "model" && chat.text !== "Thinking..." && (
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