import { useState } from 'react';
import ChatBotIcon from './ChatBotIcon';

const ChatMessage = ({ chat }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(chat.text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = chat.text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy message:', err);
        }
    };

    return (
        !chat.hideInChat && (
            <div className={`message ${chat.role === "model" ? "bot" : "user"}-message`}>
                {chat.role === "model" && <ChatBotIcon />}
                <div className="message-content">
                    <p className="message-text">{chat.text}</p>
                    <button
                        type="button"
                        className="copy-message-btn material-symbols-outlined"
                        onClick={handleCopy}
                        title={copied ? "Copied!" : "Copy message"}
                        aria-label={copied ? "Copied" : "Copy message"}
                    >
                        {copied ? "check" : "content_copy"}
                    </button>
                </div>
            </div>
        )
    );
};

export default ChatMessage;