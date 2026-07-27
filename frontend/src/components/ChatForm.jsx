import { useRef } from 'react';

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse, onFileUpload, attachedFiles = [], isUploading = false }) => {
    const inputRef = useRef();
    const fileInputRef = useRef();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;
        inputRef.current.value = "";

        setChatHistory(history => [...history, { role: "user", text: userMessage }]);
        generateBotResponse([...chatHistory, { role: "user", text: userMessage }]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) {
            onFileUpload(file);
        }
        // Reset the file input value so selecting the same file again triggers change event
        e.target.value = "";
    };

    return (
        <form className='chat-form-unified' onSubmit={handleFormSubmit}>
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                disabled={isUploading}
            />

            <div className="input-row">
                <button 
                    type="button" 
                    className="attach-btn material-symbols-outlined" 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Attach file (.pdf, .docx, .xlsx, .csv, .txt)"
                    disabled={isUploading}
                    style={{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                    {isUploading ? 'sync' : 'attachment'}
                </button>
                <input 
                    type="text" 
                    placeholder={isUploading ? "Uploading file..." : "Type your message..."}
                    className="chat-input" 
                    ref={inputRef}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name="chat-message"
                    required 
                    disabled={isUploading}
                    style={{ cursor: isUploading ? 'not-allowed' : 'text' }}
                />
                <button 
                    className="material-symbols-rounded send-btn"
                    disabled={isUploading}
                    style={{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                    arrow_upward
                </button>
            </div>
        </form>
    );
};

export default ChatForm;