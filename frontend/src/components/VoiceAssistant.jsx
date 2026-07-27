import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceAssistant.css';

const VoiceAssistant = ({ isOpen, onClose, generateBotResponse, chatHistory, setChatHistory }) => {
    const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
    const [transcript, setTranscript] = useState('');
    const [botText, setBotText] = useState('');
    const [orbScale, setOrbScale] = useState(1);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const orbAnimRef = useRef(null);
    const autoRestartRef = useRef(true);

    // Animate orb when speaking/listening
    useEffect(() => {
        if (status === 'listening' || status === 'speaking') {
            let dir = 1;
            let scale = 1;
            orbAnimRef.current = setInterval(() => {
                scale += dir * (Math.random() * 0.025);
                if (scale > 1.12) dir = -1;
                if (scale < 0.92) dir = 1;
                setOrbScale(scale);
            }, 80);
        } else {
            clearInterval(orbAnimRef.current);
            setOrbScale(1);
        }
        return () => clearInterval(orbAnimRef.current);
    }, [status]);

    const speak = useCallback((text) => {
        synthRef.current.cancel();
        const cleanText = text.replace(/[*_`#~]/g, '').replace(/📎/g, '').trim();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.rate = 1.05;
        utter.pitch = 1;
        utter.volume = 1;

        // Pick a natural voice if available
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(v =>
            v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')
        ) || voices[0];
        if (preferred) utter.voice = preferred;

        utter.onstart = () => setStatus('speaking');
        utter.onend = () => {
            setStatus('idle');
            // After speaking, start listening again automatically
            if (autoRestartRef.current && recognitionRef.current) {
                setTimeout(() => {
                    try { recognitionRef.current.start(); } catch (e) {}
                }, 600);
            }
        };
        synthRef.current.speak(utter);
    }, []);

    const handleSend = useCallback(async (text) => {
        if (!text.trim()) return;
        setTranscript(text);
        setStatus('thinking');
        setBotText('');

        const newHistory = [...chatHistory, { role: "user", text }];
        setChatHistory(prev => [...prev, { role: "user", text }]);

        // Build messages for API call
        const systemMessage = newHistory.find(m => m.hideInChat);
        const conversationHistory = newHistory.filter(m => !m.hideInChat);
        const messages = [];

        if (systemMessage) {
            messages.push({
                role: "system",
                content: `You are a helpful AI assistant.\n\nCompany Information:\n${systemMessage.text}`
            });
        }
        conversationHistory.forEach(({ role, text: t }) => {
            messages.push({ role: role === "model" ? "assistant" : "user", content: t });
        });

        try {
            const backendUrl = import.meta.env.VITE_API_URL
                ? import.meta.env.VITE_API_URL.replace(/\/$/, '').replace(/\/api$/, '') + '/api/chat'
                : `${window.location.origin}/api/chat`;

            const res = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed");
            const answer = data.data.choices[0].message.content
                .replace(/\*\*(.*?)\*\*/g, "$1").trim();
            setBotText(answer);
            setChatHistory(prev => [...prev, { role: "model", text: answer }]);
            speak(answer);
        } catch (err) {
            const errMsg = "Sorry, something went wrong. Please try again.";
            setBotText(errMsg);
            speak(errMsg);
        }
    }, [chatHistory, setChatHistory, speak]);

    // Setup speech recognition
    useEffect(() => {
        if (!isOpen) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setStatus('listening');
        rec.onerror = () => setStatus('idle');
        rec.onend = () => {
            if (status !== 'thinking' && status !== 'speaking') {
                setStatus('idle');
            }
        };
        rec.onresult = (event) => {
            const text = event.results[0][0].transcript;
            rec.stop();
            handleSend(text);
        };

        recognitionRef.current = rec;

        // Auto-start listening when modal opens
        setTimeout(() => {
            try { rec.start(); } catch (e) {}
        }, 500);

        return () => {
            try { rec.stop(); } catch (e) {}
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleClose = () => {
        autoRestartRef.current = false;
        synthRef.current.cancel();
        try { recognitionRef.current?.stop(); } catch (e) {}
        setStatus('idle');
        setTranscript('');
        setBotText('');
        onClose();
        // Reset for next open
        setTimeout(() => { autoRestartRef.current = true; }, 300);
    };

    const handleMicClick = () => {
        if (status === 'speaking') {
            synthRef.current.cancel();
            setStatus('idle');
            return;
        }
        if (status === 'listening') {
            try { recognitionRef.current?.stop(); } catch (e) {}
            setStatus('idle');
            return;
        }
        if (status === 'idle') {
            try { recognitionRef.current?.start(); } catch (e) {}
        }
    };

    if (!isOpen) return null;

    const statusLabel = {
        idle: 'Tap to speak',
        listening: 'Listening...',
        thinking: 'Thinking...',
        speaking: 'Speaking...'
    }[status];

    return (
        <div className="va-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="va-modal">
                {/* Close button */}
                <button className="va-close-btn material-symbols-outlined" onClick={handleClose}>
                    close
                </button>

                {/* Chat transcript area */}
                <div className="va-transcript-area">
                    {transcript && (
                        <div className="va-user-bubble">{transcript}</div>
                    )}
                    {botText && (
                        <div className="va-bot-text">{botText}</div>
                    )}
                    {status === 'thinking' && (
                        <div className="va-thinking-dots">
                            <span /><span /><span />
                        </div>
                    )}
                </div>

                {/* Animated Orb */}
                <div className="va-orb-container" onClick={handleMicClick}>
                    <div
                        className={`va-orb ${status}`}
                        style={{ transform: `scale(${orbScale})` }}
                    >
                        <div className="va-orb-inner" />
                    </div>
                </div>

                {/* Status label */}
                <p className="va-status-label">{statusLabel}</p>
            </div>
        </div>
    );
};

export default VoiceAssistant;
gi