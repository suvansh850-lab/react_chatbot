import React from 'react';
import { useAuth } from '../context/AuthContext';
import "./Sidebar.css";

const Sidebar = ({ startNewChat, chatList = [], loadChat, activeChatId, isSidebarOpen, onLogout, loggingOut }) => {
  const { user } = useAuth();
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
            chatList.map((chat) => (
              <div
                key={chat.id}
                className={`history-item ${chat.id === activeChatId ? 'active' : ''}`}
                onClick={() => loadChat && loadChat(chat.id)}
                title={chat.title}
              >
                {chat.title}
              </div>
            ))
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
