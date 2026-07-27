const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Automatically initialize database tables
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(100),
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_files (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_chats (
        id VARCHAR(50) PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        share_token VARCHAR(100) UNIQUE NOT NULL,
        title TEXT,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS morepen_knowledge (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("📁 Database tables initialized successfully.");
    
    // Auto-migrate static knowledge data
    await migrateStaticKnowledge();
  } catch (err) {
    console.error("❌ Error initializing database tables:", err.message);
  }
};

const migrateStaticKnowledge = async () => {
  try {
    const checkRes = await pool.query("SELECT COUNT(*) FROM morepen_knowledge");
    const count = parseInt(checkRes.rows[0].count);
    if (count === 0) {
      console.log("🚚 Migrating static company info to database...");
      const { companyInfo } = require("../services/tools/companyInfoData");
      const paragraphs = companyInfo
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 20);

      for (const para of paragraphs) {
        const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
        const titleLine = lines[0] || "Morepen Overview";
        const cleanTitle = titleLine.replace(/[#*_\-:]/g, "").trim().substring(0, 100);
        
        await pool.query(
          "INSERT INTO morepen_knowledge (title, content, category) VALUES ($1, $2, $3)",
          [cleanTitle || "General Information", para, "Auto-Migrated"]
        );
      }
      console.log(`✅ Successfully migrated ${paragraphs.length} knowledge items.`);
    }
  } catch (err) {
    console.error("❌ Error during knowledge migration:", err.message);
  }
};

initDb();

module.exports = pool;