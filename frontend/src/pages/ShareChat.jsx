import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import ChatBotIcon from '../components/ChatBotIcon';

const ShareChat = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);

  useEffect(() => {
    const fetchSharedConversation = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiRoot = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : window.location.origin;
        const response = await fetch(`${apiRoot}/api/share/${token}`);
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
  }, [token]);

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
