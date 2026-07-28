const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", chatController.handleChat);
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:id/messages", chatController.getMessages);
router.put("/conversations/:id", chatController.renameConversation);
router.delete("/conversations/:id", chatController.deleteConversation);
router.post("/conversations/:id/upload-file", upload.single("file"), chatController.uploadFile);
router.get("/conversations/:id/files", chatController.getConversationFiles);
router.post("/parse-website", chatController.parseWebsite);
router.post("/parse-google-drive", chatController.parseGoogleDrive);

module.exports = router;
