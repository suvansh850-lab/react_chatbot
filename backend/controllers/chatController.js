const groqService = require("../services/groqService");
const db = require("../database/db");

async function handleChat(req, res) {
  try {
    const { conversationId, title, messages, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format. 'messages' array is required."
      });
    }

    // Call Groq Service
    const completion = await groqService.generateChatCompletion(messages);
    
    // Extract reply text
    const botResponseText = completion.choices[0].message.content;

    // Extract the latest user message from the messages array for logging
    const userMessages = messages.filter(m => m.role === "user");
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : "";

    // Save to database asynchronously (don't block the client response if DB fails)
    try {
      if (conversationId && lastUserMessage && botResponseText) {
        // 1. Insert or update the conversation
        await db.query(
          `INSERT INTO conversations (id, title, user_id) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, user_id = EXCLUDED.user_id`,
          [conversationId, title || "New Chat", userId || null]
        );

        // 2. Insert the user message
        await db.query(
          "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
          [conversationId, "user", lastUserMessage]
        );

        // 3. Insert the assistant response
        await db.query(
          "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
          [conversationId, "assistant", botResponseText]
        );
      }
    } catch (dbError) {
      console.error("Failed to log chat to database:", dbError.message);
      // We do not fail the request if database logging fails, so the chatbot remains functional
    }

    return res.json({
      success: true,
      data: completion
    });
  } catch (error) {
    console.error("Chat controller error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getConversations(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId query parameter is required"
      });
    }
    const result = await db.query(
      "SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getMessages(req, res) {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [id]
    );
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  handleChat,
  getConversations,
  getMessages
};
