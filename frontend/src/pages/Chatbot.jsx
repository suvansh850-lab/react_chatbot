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

const buildClientShareUrl = (payload) => {
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
  return `${window.location.origin}/share?data=${encoded}`;
};

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });
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
        const backendUrl = `${getBackendRoot()}/chat`;
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
    if (emptyChat) {
      setActiveChatId(emptyChat.id);
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      return;
    }

    const newId = Date.now().toString();
    setChats(prev => [{ id: newId, title: "New Chat", history: [{ hideInChat: true, role: "model", text: CompanyInfo }], loaded: true }, ...prev]);
    setActiveChatId(newId);
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const loadChat = async (chatId) => {
    setActiveChatId(chatId);
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
    const target = chats.find(c => c.id === chatId);
    if (target && !target.loaded) {
      try {
        const backendUrl = `${getBackendRoot()}/chat`;
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

  const renameChat = async (chatId, newTitle) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));

    if (user?.id) {
      try {
        const backendUrl = `${getBackendRoot()}/chat`;
        await fetch(`${backendUrl}/conversations/${chatId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle })
        });
      } catch (err) {
        console.error("Failed to rename conversation:", err);
      }
    }
  };

  const deleteChat = async (chatId) => {
    const updatedChats = chats.filter(c => c.id !== chatId);
    let newActiveId = activeChatId;

    if (activeChatId === chatId) {
      if (updatedChats.length > 0) {
        newActiveId = updatedChats[0].id;
      } else {
        const initialChatId = Date.now().toString();
        updatedChats.push({
          id: initialChatId,
          title: "New Chat",
          history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
          loaded: true
        });
        newActiveId = initialChatId;
      }
    }

    setChats(updatedChats);
    setActiveChatId(newActiveId);

    if (user?.id) {
      try {
        const backendUrl = `${getBackendRoot()}/chat`;
        await fetch(`${backendUrl}/conversations/${chatId}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
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
        content: `You are a helpful AI assistant. You can answer questions about the company Dr. Morepen, and also assist the user with any files they have uploaded in this conversation.\n\nCompany Information:\n${systemMessage.text}`
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
      const backendUrl = `${getBackendRoot()}/chat`;
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

  const shareCurrentChat = async () => {
    if (!activeChat) {
      alert("No active chat to share.");
      return;
    }

    const visibleHistory = activeChat.history.filter(message => !message.hideInChat);
    if (visibleHistory.length === 0) {
      alert("This chat has no messages to share.");
      return;
    }

    const fallbackPayload = {
      title: activeChat.title,
      messages: visibleHistory
    };

    try {
      const apiRoot = getBackendRoot();
      const response = await fetch(`${apiRoot}/share/${activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeChat.title,
          messages: visibleHistory,
          userId: user?.id
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const text = await response.text();
        throw new Error(`Share request failed (${response.status}): ${text}`);
      }

      if (!response.ok || !data.success) {
        const baseError = data?.error || `Could not create share link. HTTP ${response.status}`;
        throw new Error(baseError);
      }

      const shareUrl = data.data.url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: activeChat.title,
            url: shareUrl
          });
        } catch (shareErr) {
          // User cancelled native share dialog — not an error
        }
      }

      alert(`Share link created and copied to clipboard:\n${shareUrl}`);
      return;
    } catch (err) {
      if (isLikelyMissingProdApiConfig(err?.message || "")) {
        alert("Share link is unavailable because VITE_API_URL is not configured for production. Add VITE_API_URL in Vercel Environment Variables and redeploy.");
        return;
      }
      console.warn("Backend share failed, falling back to client-side share:", err);
    }

    const fallbackUrl = buildClientShareUrl(fallbackPayload);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fallbackUrl);
    }
    alert(`Backend share failed, but a client-side share link was created instead:\n${fallbackUrl}`);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="container">
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar
        startNewChat={startNewChat}
        chatList={chats}
        loadChat={loadChat}
        activeChatId={activeChatId}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        renameChat={renameChat}
        deleteChat={deleteChat}
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
          <button
            className="share-chat-btn material-symbols-outlined"
            onClick={shareCurrentChat}
            title="Share chat"
          >
            share
          </button>
        </div>

        {/* Chat body */}
        <div ref={chatBodyRef} className="chat-body">
          <ChatMessage chat={{ role: "model", text: "Hello! I am your Morepen Analyst Chatbot. How can I assist you today?" }} />
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
