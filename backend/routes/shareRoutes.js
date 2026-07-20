const express = require("express");
const router = express.Router();
const shareController = require("../controllers/shareController");

router.post("/:conversationId", shareController.createShareLink);
router.get("/:token", shareController.getSharedConversation);

module.exports = router;
