import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import "./Sidebar.css";

const Sidebar = ({
  startNewChat,
  chatList = [],
  loadChat,
  activeChatId,
  notebooks = [],
  activeNotebookId,
  createNotebook,
  selectNotebook,
  renameNotebook,
  deleteNotebook,
  isSidebarOpen,
  onLogout,
  loggingOut,
  renameChat,
  deleteChat
}) => {
  const { user } = useAuth();
  const [editingChatId, setEditingChatId] = useState(null);
  const [editChatTitle, setEditChatTitle] = useState("");
  const [editingNotebookId, setEditingNotebookId] = useState(null);
  const [editNotebookTitle, setEditNotebookTitle] = useState("");
  const [showAllNotebooks, setShowAllNotebooks] = useState(false);

  const handleChatRenameSubmit = (chatId) => {
    const trimmed = editChatTitle.trim();
    if (trimmed && renameChat) {
      renameChat(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const handleNotebookRenameSubmit = (notebookId) => {
    const trimmed = editNotebookTitle.trim();
    if (trimmed && renameNotebook) {
      renameNotebook(notebookId, trimmed);
    }
    setEditingNotebookId(null);
  };

  const displayedNotebooks = showAllNotebooks ? notebooks : notebooks.slice(0, 3);

  return (
    <div className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <h2>Morepen AI</h2>
      </div>

      <div className="sidebar-content">
        {/* ── Notebooks Section ── */}
        <div className="sidebar-section notebooks-section">
          <div className="section-header-title">Notebooks</div>

          <button className="new-notebook-btn" onClick={createNotebook}>
            <span className="material-symbols-outlined icon">add</span>
            <span>New notebook</span>
          </button>

          <div className="notebook-list">
            {notebooks.length === 0 ? (
              <p className="empty-section-text">No notebooks yet</p>
            ) : (
              displayedNotebooks.map((nb) => {
                const isEditing = nb.id === editingNotebookId;
                const isActive = nb.id === activeNotebookId;
                return (
                  <div
                    key={nb.id}
                    className={`sidebar-item notebook-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (!isEditing && selectNotebook) selectNotebook(nb.id);
                    }}
                    title={nb.title}
                  >
                    <span className="material-symbols-outlined item-icon">menu_book</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="rename-input"
                        value={editNotebookTitle}
                        onChange={(e) => setEditNotebookTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNotebookRenameSubmit(nb.id);
                          else if (e.key === 'Escape') setEditingNotebookId(null);
                        }}
                        onBlur={() => handleNotebookRenameSubmit(nb.id)}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="item-title-text">{nb.title}</span>
                        <div className="action-buttons">
                          <button
                            className="rename-btn material-symbols-outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNotebookId(nb.id);
                              setEditNotebookTitle(nb.title);
                            }}
                            title="Rename notebook"
                          >
                            edit
                          </button>
                          <button
                            className="delete-btn material-symbols-outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to delete this notebook?")) {
                                deleteNotebook && deleteNotebook(nb.id);
                              }
                            }}
                            title="Delete notebook"
                          >
                            delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}

            {notebooks.length > 3 && (
              <button
                className="all-notebooks-btn"
                onClick={() => setShowAllNotebooks(!showAllNotebooks)}
              >
                <span className="material-symbols-outlined icon">more_horiz</span>
                <span>{showAllNotebooks ? "Show fewer" : "All notebooks"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Recent Chats Section (Non-Notebook standalone chats only) ── */}
        <div className="sidebar-section history-section">
          <div className="section-header-row">
            <div className="section-header-title">Recent</div>
            <button className="new-chat-icon-btn" onClick={startNewChat} title="New chat">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          {(() => {
            const standaloneChats = chatList.filter(c => !c.notebookId);
            if (standaloneChats.length === 0) {
              return <p className="empty-section-text">No standalone chats yet</p>;
            }
            return standaloneChats.map((chat) => {
              const isEditing = chat.id === editingChatId;
              const isActive = chat.id === activeChatId && !activeNotebookId;
              return (
                <div
                  key={chat.id}
                  className={`sidebar-item history-item ${isActive ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                  onClick={() => {
                    if (!isEditing && loadChat) loadChat(chat.id);
                  }}
                  title={chat.title}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      className="rename-input"
                      value={editChatTitle}
                      onChange={(e) => setEditChatTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleChatRenameSubmit(chat.id);
                        else if (e.key === 'Escape') setEditingChatId(null);
                      }}
                      onBlur={() => handleChatRenameSubmit(chat.id)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="item-title-text">{chat.title}</span>
                      <div className="action-buttons">
                        <button
                          className="rename-btn material-symbols-outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(chat.id);
                            setEditChatTitle(chat.title);
                          }}
                          title="Rename chat"
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
                          title="Delete chat"
                        >
                          delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── Bottom: User Info & Sign Out ── */}
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
  );
};

export default Sidebar;
