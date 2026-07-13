const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.post("/", chatController.handleChat);
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:id/messages", chatController.getMessages);

module.exports = router;
