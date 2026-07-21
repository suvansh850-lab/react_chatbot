import ChatBotIcon from './ChatBotIcon';

const ChatMessage = ({ chat }) => {
    return (
        !chat.hideInChat && (
            <div className={`message ${chat.role === "model" ? "bot" : "user"}-message`}>
                {chat.role === "model" && <ChatBotIcon />}
                <div className="message-content">
                    <p className="message-text">{chat.text}</p>
                </div>
            </div>
        )
    );
};

export default ChatMessage;