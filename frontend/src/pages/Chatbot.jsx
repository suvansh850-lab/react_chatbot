import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import ChatBotIcon from '../components/ChatBotIcon';
import ChatForm from '../components/ChatForm';
import ChatMessage from '../components/ChatMessage';
import Sidebar from '../components/Sidebar';
import VoiceAssistant from '../components/VoiceAssistant';
import NotebookView from '../components/NotebookView';
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
    return [
      {
        id: initialChatId,
        title: "How Can I Help?",
        notebookId: "nb_1",
        history: [
          { hideInChat: true, role: "model", text: CompanyInfo },
          { role: "user", text: "How Can I Help?" },
          { role: "model", text: "Hello! I am your Morepen Analyst Chatbot. How can I assist you today?" }
        ],
        loaded: true
      },
      {
        id: (Date.now() - 1000).toString(),
        title: "Incomplete Message Received",
        notebookId: "nb_1",
        history: [
          { hideInChat: true, role: "model", text: CompanyInfo },
          { role: "user", text: "Incomplete Message Received" },
          { role: "model", text: "If a message is incomplete, please let me know and I will re-send the full answer." }
        ],
        loaded: true
      }
    ];
  });

  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('groq/llama-3.3-70b-versatile');
  const chatBodyRef = useRef();

  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'notebook'

  // Derived state
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const chatHistory = activeChat ? activeChat.history : EMPTY_HISTORY;

  const [notebooks, setNotebooks] = useState(() => {
    const savedKey = user?.id ? `morepen_notebooks_${user.id}` : "morepen_notebooks";
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: "nb_1", title: "Untitled notebook", createdAt: Date.now() - 86400000 },
      { id: "nb_2", title: "Professional Profile and Resume", createdAt: Date.now() - 172800000 }
    ];
  });
  const [activeNotebookId, setActiveNotebookId] = useState(null);
  const activeNotebook = notebooks.find(n => n.id === activeNotebookId);

  // Persist chats to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`morepen_chats_${user.id}`, JSON.stringify(chats));
    }
  }, [chats, user]);

  // Persist notebooks to localStorage
  useEffect(() => {
    const savedKey = user?.id ? `morepen_notebooks_${user.id}` : "morepen_notebooks";
    localStorage.setItem(savedKey, JSON.stringify(notebooks));
  }, [notebooks, user]);

  const createNotebook = () => {
    const newId = `nb_${Date.now()}`;
    const newNotebook = {
      id: newId,
      title: "Untitled notebook",
      createdAt: Date.now()
    };
    setNotebooks(prev => [newNotebook, ...prev]);
    selectNotebook(newId, "Untitled notebook");
  };

  const selectNotebook = (notebookId, title = "Notebook Chat") => {
    setActiveNotebookId(notebookId);
    setViewMode('notebook');
    const nb = notebooks.find(n => n.id === notebookId);
    const notebookTitle = nb ? nb.title : title;
    
    const existingChat = chats.find(c => c.notebookId === notebookId);
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setAttachedFiles([]);
    } else {
      const newChatId = Date.now().toString();
      setChats(prev => [{
        id: newChatId,
        title: notebookTitle,
        notebookId: notebookId,
        history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
        loaded: true
      }, ...prev]);
      setActiveChatId(newChatId);
      setAttachedFiles([]);
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const handleNotebookPromptSend = (promptText) => {
    setViewMode('chat');
    
    let targetChatId = activeChatId;
    let targetChat = chats.find(c => c.id === targetChatId);

    if (!targetChat || (activeNotebookId && targetChat.notebookId !== activeNotebookId)) {
      targetChatId = Date.now().toString();
      const title = promptText.length > 25 ? promptText.substring(0, 25) + "..." : promptText;
      targetChat = {
        id: targetChatId,
        title: title,
        notebookId: activeNotebookId,
        history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
        loaded: true
      };
      setChats(prev => [targetChat, ...prev]);
      setActiveChatId(targetChatId);
    }

    const userMsg = { role: "user", text: promptText };
    const updatedHistory = [...(targetChat ? targetChat.history : []), userMsg];

    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        return { ...c, history: updatedHistory };
      }
      return c;
    }));

    generateBotResponse(updatedHistory, targetChatId);
  };

  const renameNotebook = (notebookId, newTitle) => {
    setNotebooks(prev => prev.map(nb => nb.id === notebookId ? { ...nb, title: newTitle } : nb));
    setChats(prev => prev.map(c => c.notebookId === notebookId ? { ...c, title: newTitle } : c));
  };

  const deleteNotebook = (notebookId) => {
    setNotebooks(prev => prev.filter(nb => nb.id !== notebookId));
    if (activeNotebookId === notebookId) {
      setActiveNotebookId(null);
      setViewMode('chat');
    }
  };

  const addSourceToNotebook = (notebookId, sourceObj) => {
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== notebookId) return nb;
      const currentSources = nb.sources || [];
      return { ...nb, sources: [...currentSources, sourceObj] };
    }));
  };

  const removeSourceFromNotebook = (notebookId, index) => {
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== notebookId) return nb;
      const currentSources = nb.sources || [];
      return { ...nb, sources: currentSources.filter((_, i) => i !== index) };
    }));
  };

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
    setActiveNotebookId(null);
    setViewMode('chat');
    const newId = Date.now().toString();
    setChats(prev => [{ id: newId, title: "New Chat", notebookId: null, history: [{ hideInChat: true, role: "model", text: CompanyInfo }], loaded: true }, ...prev]);
    setActiveChatId(newId);
    setActiveNotebookId(null);
    setViewMode('chat');
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const loadChat = async (chatId) => {
    setViewMode('chat');
    setActiveChatId(chatId);
    setAttachedFiles([]);
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
    
    try {
      const backendUrl = `${getBackendRoot()}/chat`;
      const res = await fetch(`${backendUrl}/conversations/${chatId}/files`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAttachedFiles(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load conversation files:", err);
    }

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

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    
    let currentChatId = activeChatId;
    let currentChat = chats.find(c => c.id === currentChatId);

    if (!currentChat || (activeNotebookId && currentChat.notebookId !== activeNotebookId)) {
      currentChatId = Date.now().toString();
      const title = activeNotebook ? activeNotebook.title : "New Chat";
      currentChat = {
        id: currentChatId,
        title: title,
        notebookId: activeNotebookId || null,
        history: [{ hideInChat: true, role: "model", text: CompanyInfo }],
        loaded: true
      };
      setChats(prev => [currentChat, ...prev]);
      setActiveChatId(currentChatId);
    }
    
    const formData = new FormData();
    formData.append("file", file);
    if (user?.id) {
      formData.append("userId", user.id);
    }
    
    try {
      const backendUrl = `${getBackendRoot()}/chat`;
      const res = await fetch(`${backendUrl}/conversations/${currentChatId}/upload-file`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAttachedFiles(prev => [...prev, data.fileName]);
        
        if (activeNotebookId) {
          const cleanParsedText = (data.parsedText || "").replace(/\0/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
          addSourceToNotebook(activeNotebookId, {
            id: Date.now(),
            name: file.name,
            type: 'file',
            content: cleanParsedText || `File name: ${file.name}`
          });
        }

        const userFileMsg = {
          role: "user",
          text: `Uploaded file: ${file.name}`,
          fileCard: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }
        };

        const confirmMsg = {
          role: "model",
          text: `📎 **File uploaded successfully:** \`${data.fileName}\`\n\nI have parsed the file and it is ready for analysis. What would you like to know about it?`
        };
        
        setChats(prev => prev.map(c => {
          if (c.id === currentChatId) {
            return {
              ...c,
              history: [...c.history, userFileMsg, confirmMsg]
            };
          }
          return c;
        }));
      } else {
        alert(`Failed to upload file: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Error uploading file: ${err.message}`);
    } finally {
      setIsUploading(false);
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

  const generateBotResponse = async (history, targetChatId) => {
    const targetId = targetChatId || activeChatId;

    setChats(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      return { ...c, history: [...c.history, { role: "model", text: "Thinking..." }] };
    }));

    const updateHistory = (text) => {
      setChats(prev => prev.map(c => {
        if (c.id !== targetId) return c;
        let title = c.title;
        const newHist = [...c.history.filter(m => m.text !== "Thinking..."), { role: "model", text }];
        if (title === "New Chat" || title === "Untitled notebook") {
          const firstUser = newHist.find(m => m.role === "user");
          if (firstUser) title = firstUser.text.length > 25 ? firstUser.text.substring(0, 25) + "..." : firstUser.text;
        }
        return { ...c, title, history: newHist };
      }));
    };

    const targetChatObj = chats.find(c => c.id === targetId);
    const targetNbId = targetChatObj?.notebookId || activeNotebookId;
    const targetNotebook = notebooks.find(n => n.id === targetNbId);

    let notebookContextText = "";
    if (targetNotebook && targetNotebook.sources && targetNotebook.sources.length > 0) {
      const sourceList = targetNotebook.sources.map((src, i) => {
        const textContent = src.content || src.text || "";
        if (src.type === 'note') {
          return `[Source ${i + 1} - Note: "${src.name}"]\n${textContent}`;
        } else if (src.type === 'website') {
          return `[Source ${i + 1} - Website: "${src.name}"]\nURL: ${src.url || src.name}\n${textContent}`;
        } else {
          return `[Source ${i + 1} - File: "${src.name}"]\n${textContent}`;
        }
      }).join("\n\n");

      notebookContextText = `\n\nATTACHED NOTEBOOK SOURCES:\nYou have access to the following user-provided sources in this notebook workspace ("${targetNotebook.title}"). Always prioritize using information from these sources to answer the user's questions accurately:\n\n${sourceList}`;
    }

    const systemMessage = history.find(m => m.hideInChat);
    const conversationHistory = history.filter(m => !m.hideInChat);
    const messages = [];

    if (systemMessage) {
      messages.push({
        role: "system",
        content: `You are a helpful AI assistant. You can answer questions about the company Dr. Morepen, and also assist the user with any files or sources added in this conversation.\n\nCompany Information:\n${systemMessage.text}${notebookContextText}`
      });
    } else if (notebookContextText) {
      messages.push({
        role: "system",
        content: `You are a helpful AI assistant.${notebookContextText}`
      });
    }

    conversationHistory.forEach(({ role, text }) => {
      messages.push({ role: role === "model" ? "assistant" : "user", content: text });
    });

    const currentChatObj = chats.find(c => c.id === targetId);
    let chatTitle = currentChatObj ? currentChatObj.title : "New Chat";
    if (chatTitle === "New Chat" || chatTitle === "Untitled notebook") {
      const userMsg = history.find(m => m.role === "user");
      if (userMsg) chatTitle = userMsg.text.length > 25 ? userMsg.text.substring(0, 25) + "..." : userMsg.text;
    }

    try {
      const backendUrl = `${getBackendRoot()}/chat`;
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: targetId, title: chatTitle, messages, userId: user?.id, model: selectedModel })
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
    <>
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
        notebooks={notebooks}
        activeNotebookId={activeNotebookId}
        createNotebook={createNotebook}
        selectNotebook={selectNotebook}
        renameNotebook={renameNotebook}
        deleteNotebook={deleteNotebook}
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
          <div className="header-actions">
            {/* Voice button */}
            <button
              className="voice-assist-btn"
              onClick={() => setIsVoiceOpen(true)}
              title="Start voice assistant"
            >
              <span className="material-symbols-outlined">graphic_eq</span>
            </button>
            <button
              className="share-chat-btn material-symbols-outlined"
              onClick={shareCurrentChat}
              title="Share chat"
            >
              share
            </button>
          </div>
        </div>

        {/* Body View */}
        {viewMode === 'notebook' && activeNotebook ? (
          <NotebookView
            notebook={activeNotebook}
            onRenameNotebook={renameNotebook}
            onFileUpload={handleFileUpload}
            chats={chats}
            onSelectChat={(chatId) => {
              loadChat(chatId);
              setViewMode('chat');
            }}
            onSendPrompt={handleNotebookPromptSend}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isUploading={isUploading}
            setIsVoiceOpen={setIsVoiceOpen}
            onAddSource={(srcObj) => addSourceToNotebook(activeNotebookId, srcObj)}
            onDeleteSource={(idx) => removeSourceFromNotebook(activeNotebookId, idx)}
          />
        ) : (
          <>
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
                onFileUpload={handleFileUpload}
                attachedFiles={attachedFiles}
                isUploading={isUploading}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
            </div>
          </>
        )}
      </div>
    </div>

    {/* Voice Assistant Modal */}
    <VoiceAssistant
      isOpen={isVoiceOpen}
      onClose={() => setIsVoiceOpen(false)}
      generateBotResponse={generateBotResponse}
      chatHistory={chatHistory}
      setChatHistory={setChatHistory}
    />
    </>
  );
};

export default Chatbot;
