const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.post("/", chatController.handleChat);
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:id/messages", chatController.getMessages);
router.put("/conversations/:id", chatController.renameConversation);
router.delete("/conversations/:id", chatController.deleteConversation);

module.exports = router;
