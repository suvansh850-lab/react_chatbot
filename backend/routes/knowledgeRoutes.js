const express = require("express");
const router = express.Router();
const db = require("../database/db");

// 1. Fetch all knowledge items
router.get("/", async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM morepen_knowledge ORDER BY id DESC"
    );
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// 2. Add a new knowledge record
router.post("/", async (req, res, next) => {
  const { title, content, category } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: "Title and Content are required."
    });
  }
  
  try {
    const result = await db.query(
      "INSERT INTO morepen_knowledge (title, content, category) VALUES ($1, $2, $3) RETURNING *",
      [title, content, category || "General"]
    );
    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// 3. Edit an existing knowledge record
router.put("/:id", async (req, res, next) => {
  const { id } = req.params;
  const { title, content, category } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: "Title and Content are required."
    });
  }
  
  try {
    const result = await db.query(
      "UPDATE morepen_knowledge SET title = $1, content = $2, category = $3 WHERE id = $4 RETURNING *",
      [title, content, category || "General", id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Record not found."
      });
    }
    
    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// 4. Delete a knowledge record
router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      "DELETE FROM morepen_knowledge WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Record not found."
      });
    }
    
    return res.json({
      success: true,
      message: "Knowledge record deleted successfully."
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
