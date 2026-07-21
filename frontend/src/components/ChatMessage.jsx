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
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    )}
                    <p className="message-text">{chat.text}</p>
                </div>
            </div>
        )
    );
};

export default ChatMessage;