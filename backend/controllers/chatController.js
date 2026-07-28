const agentService = require("../services/agentService");
const db = require("../database/db");

async function handleChat(req, res) {
  try {
    const { conversationId, title, messages, userId, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format. 'messages' array is required."
      });
    }

    // Call LangChain Agent Service
    const completion = await agentService.runAgent(messages, conversationId, model);
    
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
      fileName: file.originalname,
      parsedText: fileContent
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

async function parseWebsite(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`HTTP Error ${fetchResponse.status}`);
    }

    const html = await fetchResponse.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000);

    return res.json({
      success: true,
      url,
      title,
      text: cleanText
    });
  } catch (err) {
    console.error("Website parsing error:", err.message);
    return res.status(500).json({
      success: false,
      error: `Failed to fetch website: ${err.message}`
    });
  }
}

async function parseGoogleDrive(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: "URL or File ID is required" });
  }

  try {
    let fileId = null;
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:file\/d\/|document\/d\/|presentation\/d\/|spreadsheets\/d\/|id=)([a-zA-Z0-9_-]+)/);
    
    if (match) {
      fileId = match[1];
    } else if (/^[a-zA-Z0-9_-]{10,}$/.test(cleanUrl)) {
      fileId = cleanUrl;
    }

    if (!fileId) {
      return res.status(400).json({ success: false, error: "Invalid Google Drive URL or File ID." });
    }

    let exportUrls = [];
    if (cleanUrl.includes("spreadsheets")) {
      exportUrls.push(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`);
    } else if (cleanUrl.includes("presentation")) {
      exportUrls.push(`https://docs.google.com/presentation/d/${fileId}/export/txt`);
    }

    exportUrls.push(`https://docs.google.com/document/d/${fileId}/export?format=txt`);
    exportUrls.push(`https://drive.google.com/uc?export=download&id=${fileId}`);

    let textContent = "";
    let fetchSuccess = false;

    for (const expUrl of exportUrls) {
      try {
        const resp = await fetch(expUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (resp.ok) {
          const rawText = await resp.text();
          // Check if Google returned a Sign-in HTML redirect instead of file text
          if (!rawText.includes("accounts.google.com") && !rawText.includes("identifierId") && !rawText.includes("Sign in - Google Accounts")) {
            textContent = rawText;
            fetchSuccess = true;
            break;
          }
        }
      } catch (e) {
        console.warn(`[Google Drive] Export URL attempt failed (${expUrl}):`, e.message);
      }
    }

    if (!fetchSuccess || !textContent) {
      return res.status(400).json({
        success: false,
        error: "Could not read Google Drive file. Please ensure the file permissions are set to 'Anyone with the link can view'."
      });
    }

    // Clean up HTML tags, scripts, null bytes and control characters
    textContent = textContent
      .replace(/\0/g, "")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .replace(/\s+/g, ' ')
      .trim();

    const trimmedText = textContent.substring(0, 15000);

    return res.json({
      success: true,
      fileId,
      fileName: `Google Drive File (${fileId.substring(0, 8)})`,
      text: trimmedText || "Google Drive Document Content Imported"
    });
  } catch (err) {
    console.error("Google Drive parse error:", err.message);
    return res.status(500).json({
      success: false,
      error: `Failed to fetch Google Drive content: ${err.message}`
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
  getConversationFiles,
  parseWebsite,
  parseGoogleDrive
};
