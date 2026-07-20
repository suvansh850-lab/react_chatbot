const { ChatGroq } = require("@langchain/groq");
const { HumanMessage, AIMessage, SystemMessage } = require("@langchain/core/messages");

// 1. Initialize the ChatGroq model
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
  throw new Error("Groq API key is not configured in backend/.env file.");
}

const model = new ChatGroq({
  apiKey: apiKey,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.7,
});

/**
 * Generate a chat completion using LangChain
 * @param {Array} messages - Array of { role, content } messages
 */
async function generateChatCompletion(messages) {
  try {
    // 2. Map raw message objects into LangChain message classes
    const langchainMessages = messages.map((msg) => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      } else if (msg.role === "assistant" || msg.role === "model") {
        return new AIMessage(msg.content);
      } else if (msg.role === "system") {
        return new SystemMessage(msg.content);
      }
      return new HumanMessage(msg.content); // fallback
    });

    // 3. Call the model with mapped messages
    const response = await model.invoke(langchainMessages);

    // 4. Return formatted response to match your existing controller expectations
    return {
      choices: [
        {
          message: {
            content: response.content,
          },
        },
      ],
    };
  } catch (error) {
    throw new Error(`LangChain Groq Error: ${error.message}`);
  }
}

module.exports = {
  generateChatCompletion,
};
