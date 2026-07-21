const { ChatGroq } = require("@langchain/groq");
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require("@langchain/core/messages");
const { companyInfoTool } = require("./tools/companyInfoTool");
const { datetimeTool } = require("./tools/datetimeTool");

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
  throw new Error("Groq API key is not configured in backend/.env file.");
}

const envModel = process.env.GROQ_MODEL;
const defaultToolModel = "llama-3.3-70b-versatile";
const supportedToolModels = new Set([
  "llama3-70b-8192",
  "qwen-qwq-32b",
  "llama-3.1-8b-instant",
  "deepseek-r1-distill-llama-70b",
  "llama3-8b-8192",
  "mistral-saba-24b",
  "llama-3.3-70b-versatile",
  "gemma2-9b-it",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2-instruct-0905",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
]);

const modelName = envModel && supportedToolModels.has(envModel)
  ? envModel
  : defaultToolModel;

if (envModel && modelName !== envModel) {
  console.warn(
    `GROQ_MODEL '${envModel}' is not recognized as a supported tool-calling model; using '${defaultToolModel}' instead.`
  );
}

const model = new ChatGroq({
  apiKey,
  model: modelName,
  temperature: 0.2, // Lower temperature for more consistent, factual support answers
});

const tools = [companyInfoTool, datetimeTool];
const modelWithTools = model.bindTools(tools).withConfig({ tool_choice: "auto" });

function parseToolCallFromText(text) {
  if (typeof text !== "string") {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const payload = JSON.parse(trimmed);
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const name = payload.function || payload.name;
    if (!name || typeof name !== "string") {
      return null;
    }

    const args = payload.args ?? (payload.query !== undefined ? { query: payload.query } : {});
    return {
      id: `parsed_tool_call_${Date.now()}`,
      name,
      args,
    };
  } catch {
    return null;
  }
}

function extractToolCalls(response) {
  const rawCalls = response?.tool_calls
    ?? response?.message?.tool_calls
    ?? response?.message?.additional_kwargs?.tool_calls;
  return Array.isArray(rawCalls) ? rawCalls : [];
}

function shouldRetryWithoutTools(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("tool_use_failed")
    || msg.includes("failed to call a function")
    || msg.includes("function calling");
}

async function invokeWithFallback(currentMessages, conversationId) {
  try {
    return await modelWithTools.invoke(currentMessages, {
      configurable: { conversationId }
    });
  } catch (error) {
    if (shouldRetryWithoutTools(error)) {
      console.warn("Tool call failed; retrying without tool calling:", error.message);
      return await model.invoke(currentMessages, {
        configurable: { conversationId },
        tool_choice: "none"
      });
    }
    throw error;
  }
}

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
You have access to a tool called 'get_morepen_company_info' to retrieve company details when asked about Morepen's products, history, divisions, or strategy.
If you can use the tool, do so; otherwise answer using the company information already provided.
If the user asks a question that cannot be answered using the retrieved company information, or asks for general/external knowledge, politely decline and explain you only have information about Morepen.
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
      const response = await invokeWithFallback(currentMessages, conversationId);

      const responseContent = response?.content ?? response?.message?.content ?? "";
      const rawToolCalls = extractToolCalls(response);
      const parsedToolCall = rawToolCalls.length === 0 ? parseToolCallFromText(responseContent) : null;
      const toolCalls = rawToolCalls.length > 0 ? rawToolCalls : parsedToolCall ? [parsedToolCall] : [];

      if (toolCalls.length > 0) {
        // Normalize arguments to prevent Groq API serialization errors (e.g. function=null)
        const normalizedToolCalls = toolCalls.map((tc) => ({
          ...tc,
          args: tc.args || {},
        }));

        // Append the AI message indicating tool calls to the conversational array
        currentMessages.push(new AIMessage(responseContent));

        for (const toolCall of normalizedToolCalls) {
          const tool = tools.find((t) => t.name === toolCall.name);
          if (tool) {
            console.log(`[Agent] Executing tool: "${toolCall.name}" with arguments:`, toolCall.args);
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
                content: responseContent,
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
