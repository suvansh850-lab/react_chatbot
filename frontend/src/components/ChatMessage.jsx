import { useState } from 'react';
import ChatBotIcon from './ChatBotIcon';

const ChatMessage = ({ chat }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(chat.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    return (
        !chat.hideInChat && (
            <div className={`message ${chat.role === "model" ? "bot" : "user"}-message`}>
                {chat.role === "model" && <ChatBotIcon />}
                <div className="message-content">
                    {chat.role === "model" && (
                        <button
                            type="button"
                            className={`copy-button${copied ? ' copied' : ''}`}
                            onClick={handleCopy}
                            aria-label={copied ? 'Copied to clipboard' : 'Copy answer'}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                            </svg>
                        </button>
                    )}
                    <p className="message-text">{chat.text}</p>
                </div>
            </div>
        )
    );
};

export default ChatMessage;