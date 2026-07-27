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
        <div style={{ width: '100%' }}>
            {/* Attached files preview */}
            {(attachedFiles.length > 0 || isUploading) && (
                <div className="attached-files-container">
                    {attachedFiles.map((name, idx) => (
                        <div key={idx} className="file-badge">
                            <span className="material-symbols-outlined file-badge-icon">description</span>
                            <span className="file-badge-name" title={name}>{name}</span>
                        </div>
                    ))}
                    {isUploading && (
                        <div className="file-badge uploading-badge">
                            <span className="material-symbols-outlined file-badge-icon">upload</span>
                            <span className="file-badge-name">Uploading file...</span>
                        </div>
                    )}
                </div>
            )}

            <form className='chat-form' onSubmit={handleFormSubmit}>
                <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                />
                <button 
                    type="button" 
                    className="attach-btn material-symbols-outlined" 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Attach file (.pdf, .docx, .xlsx, .csv, .txt)"
                >
                    attachment
                </button>
                <input 
                    type="text" 
                    placeholder="Type your message..." 
                    className="chat-input" 
                    ref={inputRef}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name="chat-message"
                    required 
                />
                <button className="material-symbols-rounded">
                    arrow_upward
                </button>
            </form>
        </div>
    );
};

export default ChatForm;