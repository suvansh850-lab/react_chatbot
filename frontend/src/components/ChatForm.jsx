import { useRef, useState, useEffect } from 'react';

const MODELS = [
    { label: 'Groq',   value: 'groq/llama-3.3-70b-versatile' },
    { label: 'Gemini', value: 'gemini/gemini-2.5-flash' },
];

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse, onFileUpload, attachedFiles = [], isUploading = false, selectedModel, setSelectedModel }) => {
    const inputRef = useRef();
    const fileInputRef = useRef();
    const [isListening, setIsListening] = useState(false);
    const [modelOpen, setModelOpen] = useState(false);
    const recognitionRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';
            rec.onstart = () => setIsListening(true);
            rec.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (inputRef.current) inputRef.current.value = transcript;
            };
            rec.onerror = () => setIsListening(false);
            rec.onend = () => setIsListening(false);
            recognitionRef.current = rec;
        }
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setModelOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice input is not supported in your browser. Please try Google Chrome or Microsoft Edge.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            if (inputRef.current) inputRef.current.value = "";
            recognitionRef.current.start();
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;
        inputRef.current.value = "";
        if (isListening && recognitionRef.current) recognitionRef.current.stop();
        setChatHistory(history => [...history, { role: "user", text: userMessage }]);
        generateBotResponse([...chatHistory, { role: "user", text: userMessage }]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload) onFileUpload(file);
        e.target.value = "";
    };

    const currentModelLabel = MODELS.find(m => m.value === selectedModel)?.label || 'Select Model';

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

            {/* Single row: attach -> text input -> model selector -> mic -> send */}
            <div className="input-row">

                {/* 1. Attach — leftmost */}
                <button
                    type="button"
                    className="attach-btn material-symbols-outlined"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Attach file"
                    disabled={isUploading}
                    style={{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                    {isUploading ? 'sync' : 'attachment'}
                </button>

                {/* 2. Text input */}
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

                {/* 3. Model Selector */}
                <div className="inline-model-selector" ref={dropdownRef}>
                    <button
                        type="button"
                        className="model-pill-btn"
                        onClick={() => setModelOpen(o => !o)}
                        title="Select AI model"
                        disabled={isUploading}
                    >
                        <span className="model-pill-label">{currentModelLabel}</span>
                        <span className="material-symbols-outlined model-pill-arrow">
                            {modelOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </button>

                    {modelOpen && (
                        <div className="model-dropdown">
                            {MODELS.map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    className={`model-dropdown-item ${selectedModel === m.value ? 'active' : ''}`}
                                    onClick={() => { setSelectedModel(m.value); setModelOpen(false); }}
                                >
                                    {m.label}
                                    {selectedModel === m.value && (
                                        <span className="material-symbols-outlined model-check">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. Mic */}
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

                {/* 5. Send */}
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