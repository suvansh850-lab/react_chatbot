import { useRef, useState, useEffect } from 'react';

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse, onFileUpload, attachedFiles = [], isUploading = false }) => {
    const inputRef = useRef();
    const fileInputRef = useRef();
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check for Speech Recognition API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => {
                setIsListening(true);
            };

            rec.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (inputRef.current) {
                    inputRef.current.value = transcript;
                }
            };

            rec.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            rec.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = rec;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice input is not supported in your browser. Please try Google Chrome or Microsoft Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            if (inputRef.current) {
                inputRef.current.value = ""; // Clear input for fresh dictation
            }
            recognitionRef.current.start();
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;
        inputRef.current.value = "";

        // Stop recording if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
        }

        setChatHistory(history => [...history, { role: "user", text: userMessage }]);
        generateBotResponse([...chatHistory, { role: "user", text: userMessage }]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) {
            onFileUpload(file);
        }
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
                    placeholder={isUploading ? "Uploading file..." : isListening ? "Listening..." : "Type your message..."}
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
                
                {/* Voice Search Mic Button */}
                <button
                    type="button"
                    className={`mic-btn material-symbols-outlined ${isListening ? 'listening' : ''}`}
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Voice input"}
                    disabled={isUploading}
                    style={{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                    mic
                </button>

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