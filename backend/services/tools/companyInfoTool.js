const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

/**
 * Searches the morepen_knowledge table in PostgreSQL for relevant entries based on user query keywords.
 * @param {string} query - The search query/keywords
 */
async function searchCompanyInfo(query) {
  const db = require("../../database/db");
  const searchTerm = query || "";
  
  try {
    let result;
    if (!searchTerm.trim()) {
      // Fallback: return first 10 records
      result = await db.query(
        "SELECT content FROM morepen_knowledge ORDER BY id ASC LIMIT 10"
      );
    } else {
      // Split query into words, filter out short stop-words
      const words = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      if (words.length === 0) {
        result = await db.query(
          "SELECT content FROM morepen_knowledge ORDER BY id ASC LIMIT 10"
        );
      } else {
        // Construct OR conditions for matching any of the keywords in content/title
        const conditions = [];
        const params = [];
        words.forEach((word, idx) => {
          conditions.push(`content ILIKE $${idx + 1} OR title ILIKE $${idx + 1}`);
          params.push(`%${word}%`);
        });
        
        result = await db.query(
          `SELECT content FROM morepen_knowledge WHERE ${conditions.join(" OR ")} LIMIT 10`,
          params
        );
      }
    }
    
    if (result.rows.length === 0) {
      return `No matching company information found for query: "${query}"`;
    }
    
    return result.rows.map(row => row.content).join("\n\n");
  } catch (error) {
    console.error("Error searching company info in database:", error.message);
    return `Error searching company info: ${error.message}`;
  }
}

const companyInfoTool = tool(
  async ({ query }) => {
    return searchCompanyInfo(query);
  },
  {
    name: "get_morepen_company_info",
    description: "Search and retrieve details about Morepen, including company profile, history, manufacturing sites, key product divisions (Diagnostics, OTC, Wellness), D2C strategy, and financial outlook.",
    schema: z.object({
      query: z.string().optional().describe("Search keywords or queries (e.g. 'chairman', 'motto', 'products') to filter company information.")
    }),
  }
);

module.exports = { companyInfoTool };
