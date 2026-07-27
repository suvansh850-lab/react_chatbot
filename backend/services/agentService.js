const { ChatGroq } = require("@langchain/groq");
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require("@langchain/core/messages");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { companyInfoTool } = require("./tools/companyInfoTool");
const { datetimeTool } = require("./tools/datetimeTool");
const db = require("../database/db");

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

function calculateCSVColumn(csvText, columnName, operation) {
  const lines = csvText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const cleanLines = lines.filter(line => !line.startsWith("--- Sheet:"));
  if (cleanLines.length === 0) return "Error: The file content is empty.";
  
  const parseCSVLine = (text) => {
    const result = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };
  
  const headers = parseCSVLine(cleanLines[0]);
  const colIndex = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
  if (colIndex === -1) {
    return `Error: Column '${columnName}' not found. Available columns in file: ${headers.join(", ")}`;
  }
  
  const values = [];
  for (let i = 1; i < cleanLines.length; i++) {
    const row = parseCSVLine(cleanLines[i]);
    if (row.length > colIndex) {
      const valStr = row[colIndex].replace(/[\$\,\s]/g, ""); // strip currency/commas
      const val = parseFloat(valStr);
      if (!isNaN(val)) {
        values.push(val);
      }
    }
  }
  
  if (values.length === 0) {
    return `Error: No numeric values found in column '${columnName}'.`;
  }
  
  if (operation === "sum") {
    const total = values.reduce((sum, v) => sum + v, 0);
    return `Total sum of '${columnName}': ${total} (calculated exactly over ${values.length} rows)`;
  }
  if (operation === "average") {
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    return `Average of '${columnName}': ${avg} (calculated exactly over ${values.length} rows)`;
  }
  if (operation === "min") {
    const val = Math.min(...values);
    return `Minimum value of '${columnName}': ${val}`;
  }
  if (operation === "max") {
    const val = Math.max(...values);
    return `Maximum value of '${columnName}': ${val}`;
  }
  if (operation === "count") {
    return `Total count of values in '${columnName}': ${values.length}`;
  }
  
  return "Error: Unknown operation.";
}

const fileMathTool = tool(
  async ({ columnName, operation, fileName, sheetName }, config) => {
    const conversationId = config?.configurable?.conversationId;
    if (!conversationId) {
      return "Error: No conversationId context found. Cannot query database.";
    }
    
    try {
      const dbResult = await db.query(
        "SELECT file_name, file_content FROM conversation_files WHERE conversation_id = $1",
        [conversationId]
      );
      if (dbResult.rows.length === 0) {
        return "Error: No files found for this conversation. Please upload a file first.";
      }
      
      const file = fileName 
        ? dbResult.rows.find(r => r.file_name.toLowerCase() === fileName.toLowerCase())
        : dbResult.rows[0]; // default to first file
        
      if (!file) {
        return `Error: File '${fileName}' not found. Available files: ${dbResult.rows.map(r => r.file_name).join(", ")}`;
      }
      
      let csvContent = file.file_content || "";
      
      if (sheetName) {
        const sheetMarker = `--- Sheet: ${sheetName} ---`;
        const startIdx = csvContent.indexOf(sheetMarker);
        if (startIdx === -1) {
          return `Error: Sheet '${sheetName}' not found in Excel file.`;
        }
        const rest = csvContent.substring(startIdx + sheetMarker.length);
        const endIdx = rest.indexOf("--- Sheet:");
        csvContent = endIdx === -1 ? rest : rest.substring(0, endIdx);
      }
      
      return calculateCSVColumn(csvContent, columnName, operation);
    } catch (e) {
      console.error("Error executing calculate_file_column tool:", e.message);
      return `Error: Failed to query file: ${e.message}`;
    }
  },
  {
    name: "calculate_file_column",
    description: "Calculate exact mathematical operations (sum, average, min, max, count) on a specific column of an uploaded CSV or Excel file.",
    schema: z.object({
      columnName: z.string().describe("The name of the column to calculate (e.g. 'Total_Sales', 'Profit', or 'Sales')"),
      operation: z.enum(["sum", "average", "min", "max", "count"]).describe("The mathematical operation to perform"),
      fileName: z.string().optional().describe("The name of the file (e.g. 'sales.xlsx' or 'dataset.csv')"),
      sheetName: z.string().optional().describe("For Excel files, the name of the sheet to query (e.g. 'Sheet1')")
    })
  }
);

const tools = [companyInfoTool, datetimeTool, fileMathTool];
const modelWithTools = model.bindTools(tools).withConfig({ tool_choice: "auto" });

function parseToolCallFromText(text) {
  if (typeof text !== "string") {
    return null;
  }

  const trimmed = text.trim();

  // 1. Check for XML format: <function.tool_name JSON_ARGS></function> or <function=tool_name>JSON_ARGS</function>
  const xmlMatch = trimmed.match(/<function\.?=?([a-zA-Z0-9_\-]+)\s+([\s\S]*?)\s*><\/function>/i)
                || trimmed.match(/<function\.?=?([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/function>/i);
  
  if (xmlMatch) {
    const name = xmlMatch[1];
    const argsText = xmlMatch[2].trim();
    let args = {};
    try {
      args = JSON.parse(argsText);
    } catch (e) {
      args = { query: argsText };
    }
    return {
      id: `parsed_tool_call_${Date.now()}`,
      name,
      args,
    };
  }

  // 2. Fallback to standard JSON format
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
    // Fetch uploaded files content for RAG analysis
    let fileContext = "";
    try {
      if (conversationId) {
        const dbResult = await db.query(
          "SELECT file_name, file_content FROM conversation_files WHERE conversation_id = $1",
          [conversationId]
        );
        if (dbResult && dbResult.rows.length > 0) {
          fileContext = "\n\nUploaded Files in this conversation:\n" + 
            dbResult.rows.map(row => {
              let content = row.file_content || "";
              if (content.length > 10000) {
                content = content.substring(0, 10000) + "\n\n[Content truncated to fit context limits...]";
              }
              return `--- File: ${row.file_name} ---\n${content}`;
            }).join("\n\n");
        }
      }
    } catch (dbError) {
      console.error("Failed to fetch conversation files:", dbError.message);
    }

    // 1. Map raw message formats into LangChain instances
    const langchainMessages = messages.map((msg) => {
      if (msg.role === "system") {
        // Intercept and swap bulky company data with optimized agent instructions
        if (msg.content && msg.content.includes("Company Information:")) {
          return new SystemMessage(
            `You are a helpful, general-purpose AI assistant.
You can answer any questions, write code, analyze data, and assist the user.
You have access to a tool called 'get_morepen_company_info' to retrieve company details when asked about Morepen's products, history, divisions, or strategy.
Use the 'get_current_datetime' tool if the user asks about dates or times relative to 'today'.
You also have access to a tool called 'calculate_file_column' to compute exact mathematical totals (sum, average, min, max, count) on specific columns of uploaded CSV/Excel files. Whenever the user asks you to calculate sums, averages, or totals on file data, you MUST use the 'calculate_file_column' tool to get the exact values instead of guessing or performing mental math.

IMPORTANT: The user has uploaded files to this conversation. The full parsed text contents of these files are loaded directly into your prompt context below. You MUST read the file data below, perform any calculations or analyses requested by the user, and answer their questions directly using this data. Do not say you cannot access it, as the data is already provided to you.

${fileContext}`
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
