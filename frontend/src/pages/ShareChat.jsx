import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import ChatBotIcon from '../components/ChatBotIcon';

const SharedChatMessage = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.text) return;
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className={`share-message ${message.role === 'model' ? 'bot' : 'user'}`}>
      {message.role === 'model' && <ChatBotIcon />}
      <div className="share-message-text" style={{ position: 'relative' }}>
        <p>{message.text}</p>
        {message.role === 'model' && (
          <button
            type="button"
            className={`copy-message-btn material-symbols-outlined ${isCopied ? "copied" : ""}`}
            onClick={handleCopy}
            title={isCopied ? "Copied!" : "Copy answer"}
            aria-label={isCopied ? "Copied to clipboard" : "Copy answer"}
          >
            {isCopied ? "check" : "content_copy"}
          </button>
        )}
      </div>
    </div>
  );
};

const ShareChat = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);

  const location = useLocation();

  const getBackendRoot = () => {
    if (import.meta.env.VITE_API_URL) {
      const trimmed = import.meta.env.VITE_API_URL.replace(/\/$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }

    return `${window.location.origin}/api`;
  };

  const isLikelyMissingProdApiConfig = (errorMessage = "") => {
    const isProdHost = window.location.hostname.includes("vercel.app");
    const noApiEnv = !import.meta.env.VITE_API_URL;
    const hitNotFound = errorMessage.includes("HTTP 404");
    return isProdHost && noApiEnv && hitNotFound;
  };

  useEffect(() => {
    const fetchSharedConversation = async () => {
      setLoading(true);
      setError(null);

      const queryData = new URLSearchParams(location.search).get('data');
      if (queryData) {
        try {
          const decoded = decodeURIComponent(escape(atob(decodeURIComponent(queryData))));
          const payload = JSON.parse(decoded);
          if (!payload?.messages || !Array.isArray(payload.messages)) {
            throw new Error('Invalid shared conversation payload.');
          }
          setConversation(payload);
          return;
        } catch (err) {
          setError('Invalid shared conversation data.');
          return;
        } finally {
          setLoading(false);
        }
      }

      if (!token) {
        setError('No shared chat token or data present.');
        setLoading(false);
        return;
      }

      try {
        const apiRoot = getBackendRoot();
        const response = await fetch(`${apiRoot}/share/${token}`);
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          const text = await response.text();
          throw new Error(`Load share failed (${response.status}): ${text}`);
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Unable to load shared conversation. HTTP ${response.status}`);
        }

        setConversation(data.data);
      } catch (err) {
        if (isLikelyMissingProdApiConfig(err?.message || "")) {
          setError('Shared chat cannot load because VITE_API_URL is not configured for production.');
        } else {
          setError(err.message || 'Unable to load shared conversation.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConversation();
  }, [token, location.search]);

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>Loading shared chat...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>Chat Not Found</h1>
          <p>{error}</p>
          <Link to="/" className="button-link">Return to app</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <div className="share-card">
        <div className="share-header">
          <h1>{conversation.title || 'Shared Chat'}</h1>
          <p className="share-subtitle">Read-only shared conversation</p>
        </div>
        <div className="share-body">
          {conversation.messages.map((message, index) => (
            <SharedChatMessage key={index} message={message} />
          ))}
        </div>
        <Link to="/" className="button-link">Back to Morepen Chatbot</Link>
      </div>
    </div>
  );
};

export default ShareChat;
