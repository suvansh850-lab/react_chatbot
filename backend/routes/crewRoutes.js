const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

// 1. Health check proxy
router.get("/health", async (req, res, next) => {
  try {
    const response = await axios.get(`${PYTHON_BACKEND_URL}/api/crew/health`);
    return res.json(response.data);
  } catch (error) {
    console.error("Python Backend connection error:", error.message);
    return res.status(503).json({
      success: false,
      message: "Python FastAPI Agent Service is offline.",
      error: error.message
    });
  }
});

// 2. Dashboard summary aggregation proxy
router.get("/dashboard-summary", async (req, res, next) => {
  try {
    const response = await axios.get(`${PYTHON_BACKEND_URL}/api/crew/dashboard-summary`);
    return res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// 3. CrewAI Analysis proxy
router.post("/analyze", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Query is required." });
    }
    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/crew/analyze`, { query });
    return res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// 4. CSV Upload proxy
router.post("/upload-csv", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "CSV file is required." });
    }

    // Forward multipart file to Python backend using form-data
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/crew/upload-csv`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

module.exports = router;
