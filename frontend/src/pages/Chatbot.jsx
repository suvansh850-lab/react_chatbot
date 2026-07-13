import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import ChatBotIcon from '../components/ChatBotIcon';
import ChatForm from '../components/ChatForm';
import ChatMessage from '../components/ChatMessage';
import Sidebar from '../components/Sidebar';
import { CompanyInfo } from '../CompanyInfo';

const EMPTY_HISTORY = [];

const Chatbot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chats, setChats] = useState(() => {
    const savedKey = user?.id ? `morepen_chats_${user.id}` : "morepen_chats";
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const initialChatId = Date.now().toString();
    return [{
      id: initialChatId,
      title: "New Chat",
      history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
      loaded: true
    }];
  });

  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const chatBodyRef = useRef();

  // Derived state
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const chatHistory = activeChat ? activeChat.history : EMPTY_HISTORY;

  // Persist to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`morepen_chats_${user.id}`, JSON.stringify(chats));
    }
  }, [chats, user]);

  // Load conversations from database on mount
  useEffect(() => {
    if (!user?.id) return;
    const fetchConversations = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/chat";
        const response = await fetch(`${backendUrl}/conversations?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.success && data.data.length > 0) {
          const loadedChats = data.data.map(conv => ({
            id: conv.id,
            title: conv.title,
            history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
            loaded: false
          }));
          setChats(loadedChats);
          setActiveChatId(loadedChats[0].id);

          // Eagerly load messages for the first conversation
          const firstId = loadedChats[0].id;
          const msgRes = await fetch(`${backendUrl}/conversations/${firstId}/messages`);
          const msgData = await msgRes.json();
          if (msgRes.ok && msgData.success) {
            const mapped = [
              { hideInChat: true, role: "model", text: CompanyInfo },
              ...msgData.data.map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                text: m.content
              }))
            ];
            setChats(prev => prev.map(c => c.id === firstId ? { ...c, history: mapped, loaded: true } : c));
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };
    fetchConversations();
  }, [user]);

  // ── Chat management ──────────────────────────────────────────
  const startNewChat = () => {
    const emptyChat = chats.find(c => c.loaded && !c.history.some(m => m.role === "user"));
    if (emptyChat) { setActiveChatId(emptyChat.id); return; }

    const newId = Date.now().toString();
    setChats(prev => [{ id: newId, title: "New Chat", history: [{ hideInChat: true, role: "model", text: CompanyInfo }], loaded: true }, ...prev]);
    setActiveChatId(newId);
  };

  const loadChat = async (chatId) => {
    setActiveChatId(chatId);
    const target = chats.find(c => c.id === chatId);
    if (target && !target.loaded) {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/chat";
        const res = await fetch(`${backendUrl}/conversations/${chatId}/messages`);
        const data = await res.json();
        if (res.ok && data.success) {
          const mapped = [
            { hideInChat: true, role: "model", text: CompanyInfo },
            ...data.data.map(m => ({ role: m.role === "assistant" ? "model" : "user", text: m.content }))
          ];
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, history: mapped, loaded: true } : c));
        }
      } catch (err) { console.error("Failed to load messages:", err); }
    }
  };

  // ── History helpers ──────────────────────────────────────────
  const setChatHistory = (updater) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== activeChatId) return chat;
      const newHistory = typeof updater === 'function' ? updater(chat.history) : updater;
      let title = chat.title;
      if (title === "New Chat") {
        const first = newHistory.find(m => m.role === "user");
        if (first) title = first.text.length > 25 ? first.text.substring(0, 25) + "..." : first.text;
      }
      return { ...chat, title, history: newHistory };
    }));
  };

  const generateBotResponse = async (history) => {
    setChatHistory(prev => [...prev, { role: "model", text: "Thinking..." }]);

    const updateHistory = (text) => {
      setChatHistory(prev => [...prev.filter(m => m.text !== "Thinking..."), { role: "model", text }]);
    };

    const systemMessage = history.find(m => m.hideInChat);
    const conversationHistory = history.filter(m => !m.hideInChat);
    const messages = [];

    if (systemMessage) {
      messages.push({
        role: "system",
        content: `You are a customer support chatbot for Morepen.\nYou must ONLY answer questions based on the Company Information provided below.\nIf the user asks a question that cannot be answered using the provided Company Information, or asks for general/external knowledge, you must politely decline to answer, stating that you only have information regarding Morepen.\n\nCompany Information:\n${systemMessage.text}`
      });
    }

    conversationHistory.forEach(({ role, text }) => {
      messages.push({ role: role === "model" ? "assistant" : "user", content: text });
    });

    let chatTitle = activeChat ? activeChat.title : "New Chat";
    if (chatTitle === "New Chat") {
      const userMsg = history.find(m => m.role === "user");
      if (userMsg) chatTitle = userMsg.text.length > 25 ? userMsg.text.substring(0, 25) + "..." : userMsg.text;
    }

    try {
      const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/chat";
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeChatId, title: chatTitle, messages, userId: user?.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate bot response.");
      updateHistory(data.data.choices[0].message.content.replace(/\*\*(.*?)\*\*/g, "$1").trim());
    } catch (err) {
      console.error(err);
      updateHistory("Something went wrong. Please try again.");
    }
  };

  // Auto-scroll
  useEffect(() => {
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await authService.logout();
    if (error) {
      alert(error.message);
      setLoggingOut(false);
    } else {
      if (user?.id) {
        localStorage.removeItem(`morepen_chats_${user.id}`);
      }
      navigate("/");
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="container">
      <Sidebar
        startNewChat={startNewChat}
        chatList={chats}
        loadChat={loadChat}
        activeChatId={activeChatId}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="chatbot-popup">
        {/* Header */}
        <div className="chat-header">
          <div className="header-info">
            <button
              className="menu-toggle-btn material-symbols-outlined"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              menu
            </button>
            <ChatBotIcon />
            <h2 className="logo-text">Morepen Analyst Chatbot</h2>
          </div>
        </div>

        {/* Chat body */}
        <div ref={chatBodyRef} className="chat-body">
          <div className="message bot-message">
            <ChatBotIcon />
            <p className="message-text">Hello! I am your Morepen Analyst Chatbot. How can I assist you today?</p>
          </div>
          {chatHistory.map((chat, index) => (
            <ChatMessage key={index} chat={chat} />
          ))}
        </div>

        {/* Footer */}
        <div className="chat-footer">
          <ChatForm
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            generateBotResponse={generateBotResponse}
          />
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
