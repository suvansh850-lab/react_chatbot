const axios = require("axios");

async function generateChatCompletion(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
    throw new Error("Groq API key is not configured in backend/.env file.");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: model,
        messages: messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Groq API Error: ${errorMsg}`);
  }
}

module.exports = {
  generateChatCompletion,
};
