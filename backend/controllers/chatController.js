const agentService = require("../services/agentService");
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

    // Call LangChain Agent Service
    const completion = await agentService.runAgent(messages, conversationId);
    
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

async function renameConversation(req, res) {
  const { id } = req.params;
  const { title } = req.body;
  try {
    await db.query(
      "UPDATE conversations SET title = $1 WHERE id = $2",
      [title, id]
    );
    return res.json({
      success: true,
      message: "Conversation renamed successfully"
    });
  } catch (error) {
    console.error("Failed to rename conversation:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function deleteConversation(req, res) {
  const { id } = req.params;
  try {
    await db.query(
      "DELETE FROM conversations WHERE id = $1",
      [id]
    );
    return res.json({
      success: true,
      message: "Conversation deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete conversation:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function uploadFile(req, res) {
  const { id } = req.params;
  const { userId } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }
  
  try {
    const { parseFile } = require("../services/fileParser");
    
    await db.query(
      `INSERT INTO conversations (id, title, user_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO NOTHING`,
      [id, "New Chat", userId || null]
    );

    console.log(`[File Upload] Parsing file: ${file.originalname} (${file.mimetype})`);
    const fileContent = await parseFile(file.buffer, file.mimetype, file.originalname);
    
    const result = await db.query(
      `INSERT INTO conversation_files (conversation_id, file_name, file_content) 
       VALUES ($1, $2, $3) RETURNING id`,
      [id, file.originalname, fileContent]
    );
    
    return res.json({
      success: true,
      message: `File '${file.originalname}' uploaded and parsed successfully.`,
      fileId: result.rows[0].id,
      fileName: file.originalname
    });
  } catch (error) {
    console.error("File upload and parsing error:", error.message);
    return res.status(500).json({
      success: false,
      error: `Failed to process file: ${error.message}`
    });
  }
}

async function getConversationFiles(req, res) {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT file_name FROM conversation_files WHERE conversation_id = $1 ORDER BY created_at ASC",
      [id]
    );
    return res.json({
      success: true,
      data: result.rows.map(row => row.file_name)
    });
  } catch (error) {
    console.error("Failed to fetch conversation files:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  handleChat,
  getConversations,
  getMessages,
  renameConversation,
  deleteConversation,
  uploadFile,
  getConversationFiles
};
