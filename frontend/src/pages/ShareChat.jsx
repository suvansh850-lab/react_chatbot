import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import ChatBotIcon from '../components/ChatBotIcon';

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
        setError(err.message || 'Unable to load shared conversation.');
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
            <div key={index} className={`share-message ${message.role === 'model' ? 'bot' : 'user'}`}>
              {message.role === 'model' && <ChatBotIcon />}
              <div className="share-message-text">
                <p>{message.text}</p>
              </div>
            </div>
          ))}
        </div>
        <Link to="/" className="button-link">Back to Morepen Chatbot</Link>
      </div>
    </div>
  );
};

export default ShareChat;
