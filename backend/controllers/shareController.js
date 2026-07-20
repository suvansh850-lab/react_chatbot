const { randomUUID } = require("crypto");
const db = require("../database/db");

const FALLBACK_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function getFrontendUrl(req) {
  if (req.headers.origin) {
    return req.headers.origin;
  }

  const host = req.get("host");
  if (host) {
    return `${req.protocol}://${host}`;
  }

  return FALLBACK_FRONTEND_URL;
}

async function createShareLink(req, res) {
  try {
    const { conversationId } = req.params;
    const { title, messages, userId } = req.body;

    const conversationResult = await db.query(
      "SELECT id FROM conversations WHERE id = $1",
      [conversationId]
    );

    if (conversationResult.rowCount === 0) {
      await db.query(
        "INSERT INTO conversations (id, title, user_id) VALUES ($1, $2, $3)",
        [conversationId, title || "Shared Chat", userId || null]
      );
    } else {
      await db.query(
        "UPDATE conversations SET title = $1 WHERE id = $2",
        [title || "Shared Chat", conversationId]
      );
      await db.query(
        "DELETE FROM messages WHERE conversation_id = $1",
        [conversationId]
      );
    }

    if (Array.isArray(messages) && messages.length > 0) {
      for (const message of messages) {
        if (message.text && (message.role === "user" || message.role === "model")) {
          const role = message.role === "model" ? "assistant" : "user";
          await db.query(
            "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
            [conversationId, role, message.text]
          );
        }
      }
    }

    const existingShare = await db.query(
      "SELECT share_token FROM shared_chats WHERE conversation_id = $1 LIMIT 1",
      [conversationId]
    );

    let shareToken;
    if (existingShare.rowCount > 0) {
      shareToken = existingShare.rows[0].share_token;
    } else {
      shareToken = randomUUID();
      await db.query(
        "INSERT INTO shared_chats (id, conversation_id, share_token) VALUES ($1, $2, $3)",
        [randomUUID(), conversationId, shareToken]
      );
    }

    const frontendUrl = getFrontendUrl(req);

    return res.json({
      success: true,
      data: {
        url: `${frontendUrl}/share/${shareToken}`
      }
    });
  } catch (error) {
    console.error("Create share link failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to create share link"
    });
  }
}

async function getSharedConversation(req, res) {
  try {
    const { token } = req.params;

    const tokenResult = await db.query(
      "SELECT conversation_id FROM shared_chats WHERE share_token = $1",
      [token]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Shared conversation not found"
      });
    }

    const conversationId = tokenResult.rows[0].conversation_id;
    const conversationResult = await db.query(
      "SELECT id, title FROM conversations WHERE id = $1",
      [conversationId]
    );

    if (conversationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found"
      });
    }

    const messagesResult = await db.query(
      "SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversationId]
    );

    const messages = messagesResult.rows.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      text: message.content
    }));

    return res.json({
      success: true,
      data: {
        conversationId,
        title: conversationResult.rows[0].title,
        messages
      }
    });
  } catch (error) {
    console.error("Get shared conversation failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch shared conversation"
    });
  }
}

module.exports = {
  createShareLink,
  getSharedConversation
};
