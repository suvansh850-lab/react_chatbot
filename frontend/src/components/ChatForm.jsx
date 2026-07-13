import { useRef } from 'react';

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
    const inputRef = useRef();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;
        inputRef.current.value = "";

        console.log(userMessage);

        setChatHistory(history => [...history, { role: "user", text: userMessage }]);

        generateBotResponse([...chatHistory, { role: "user", text: userMessage }]);
    };

    return (
        <form className='chat-form' onSubmit={handleFormSubmit}>
            <input type="text" placeholder="Type your message..." className="chat-input" ref={inputRef} required />
            <button className="material-symbols-rounded">arrow_upward</button>
        </form>
    );
};

export default ChatForm;