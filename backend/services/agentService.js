const { ChatGroq } = require("@langchain/groq");
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require("@langchain/core/messages");
const { companyInfoTool } = require("./tools/companyInfoTool");
const { datetimeTool } = require("./tools/datetimeTool");

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
  throw new Error("Groq API key is not configured in backend/.env file.");
}

const model = new ChatGroq({
  apiKey: apiKey,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.2, // Lower temperature for more consistent, factual support answers
});

const tools = [companyInfoTool, datetimeTool];
const modelWithTools = model.bindTools(tools);

/**
 * Execute the LangChain tool-calling Agent loop
 * @param {Array} messages - Array of { role, content } messages from client
 * @param {string} conversationId - The active conversation ID
 */
async function runAgent(messages, conversationId) {
  try {
    // 1. Map raw message formats into LangChain instances
    const langchainMessages = messages.map((msg) => {
      if (msg.role === "system") {
        // Intercept and swap bulky company data with optimized agent instructions
        if (msg.content && msg.content.includes("Company Information:")) {
          return new SystemMessage(
            `You are a customer support chatbot for Morepen.
You must ONLY answer questions based on Morepen's company information.
You have access to a tool called 'get_morepen_company_info' to retrieve company details. Always call this tool to find information when asked about Morepen's products, history, divisions, or strategy.
IMPORTANT: You only need to call a tool ONCE to retrieve the information. Once the tool has been called and the information is present in the chat history, do NOT call that tool again. Use the provided information to answer the user's question directly.
You must always return tool calls in the requested JSON format. Do not use <function> tags.
If the user asks a question that cannot be answered using the retrieved company information, or asks for general/external knowledge, you must politely decline to answer, stating that you only have information regarding Morepen.
Use the 'get_current_datetime' tool if the user asks about dates or times relative to 'today'.`
          );
        }
        return new SystemMessage(msg.content);
      } else if (msg.role === "assistant" || msg.role === "model") {
        return new AIMessage(msg.content);
      } else {
        return new HumanMessage(msg.content);
      }
    });

    let currentMessages = [...langchainMessages];
    let step = 0;
    const maxSteps = 5;

    // 2. Start the Agent Loop
    while (step < maxSteps) {
      // Pass the config block so the model and tools can access configurable values
      const response = await modelWithTools.invoke(currentMessages, {
        configurable: { conversationId }
      });

      // Check if the LLM wants to run any tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Normalize arguments to prevent Groq API serialization errors (e.g. function=null)
        response.tool_calls = response.tool_calls.map((tc) => ({
          ...tc,
          args: tc.args || {},
        }));

        // Append the AI message indicating tool calls to the conversational array
        currentMessages.push(response);

        for (const toolCall of response.tool_calls) {
          const tool = tools.find((t) => t.name === toolCall.name);
          if (tool) {
            console.log(`[Agent] Executing tool: "${toolCall.name}" with arguments:`, toolCall.args);
            // Execute the tool, forwarding the configuration block
            const toolResult = await tool.invoke(
              toolCall.args || {},
              { configurable: { conversationId } }
            );
            currentMessages.push(
              new ToolMessage({
                content: toolResult,
                tool_call_id: toolCall.id,
                name: toolCall.name,
              })
            );
          } else {
            console.warn(`[Agent] Tool "${toolCall.name}" not found.`);
            currentMessages.push(
              new ToolMessage({
                content: `Error: Tool "${toolCall.name}" was not found.`,
                tool_call_id: toolCall.id,
              })
            );
          }
        }
        step++;
      } else {
        // No tool calls requested: this is the final user-facing response
        return {
          choices: [
            {
              message: {
                content: response.content,
              },
            },
          ],
        };
      }
    }

    throw new Error("Agent execution exceeded maximum steps limit without reaching a final response.");
  } catch (error) {
    console.error("Agent Run Error:", error.message);
    throw error;
  }
}

module.exports = { runAgent };
