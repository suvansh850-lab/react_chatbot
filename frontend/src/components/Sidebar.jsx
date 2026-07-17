import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import "./Sidebar.css";

const Sidebar = ({ startNewChat, chatList = [], loadChat, activeChatId, isSidebarOpen, onLogout, loggingOut, renameChat, deleteChat }) => {
  const { user } = useAuth();
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const handleRenameSubmit = (chatId) => {
    const trimmed = editTitle.trim();
    if (trimmed && renameChat) {
      renameChat(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <h2>Morepen AI</h2>
      </div>

      <div className="sidebar-content">
        <button className="new-chat-btn" onClick={startNewChat}>
          <span>+</span> New Chat
        </button>

        <div className="history-section">
          <h3>Chat History</h3>

          {chatList.length === 0 ? (
            <p className="empty-history">No Chats yet</p>
          ) : (
            chatList.map((chat) => {
              const isEditing = chat.id === editingChatId;
              return (
                <div
                  key={chat.id}
                  className={`history-item ${chat.id === activeChatId ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                  onClick={() => {
                    if (!isEditing && loadChat) {
                      loadChat(chat.id);
                    }
                  }}
                  title={chat.title}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      className="rename-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameSubmit(chat.id);
                        } else if (e.key === 'Escape') {
                          setEditingChatId(null);
                        }
                      }}
                      onBlur={() => handleRenameSubmit(chat.id)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="chat-title-text">{chat.title}</span>
                      {chat.id === activeChatId && (
                        <div className="action-buttons">
                          <button
                            className="rename-btn material-symbols-outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditTitle(chat.title);
                            }}
                          >
                            edit
                          </button>
                          <button
                            className="delete-btn material-symbols-outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to delete this chat?")) {
                                deleteChat && deleteChat(chat.id);
                              }
                            }}
                          >
                            delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Bottom: user info + logout ── */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <span className="material-symbols-outlined sidebar-user-icon">account_circle</span>
            <span className="sidebar-user-email" title={user?.email}>{user?.email || "User"}</span>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={onLogout}
            disabled={loggingOut}
            title="Sign out"
          >
            <span className="material-symbols-outlined">logout</span>
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
