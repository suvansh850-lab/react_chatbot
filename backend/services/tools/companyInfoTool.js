const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { companyInfo } = require("./companyInfoData");

function searchCompanyInfo(query) {
  const searchTerm = query || "profile";
  const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return companyInfo.slice(0, 3000);
  }
  
  const paragraphs = companyInfo.split("\n").map(p => p.trim()).filter(Boolean);
  const matched = [];
  
  for (const para of paragraphs) {
    const lowerPara = para.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lowerPara.includes(term)) {
        score++;
      }
    }
    if (score > 0) {
      matched.push({ para, score });
    }
  }
  
  if (matched.length === 0) {
    return `No matches found for search query: "${query}"`;
  }
  
  matched.sort((a, b) => b.score - a.score);
  return matched.map(m => m.para).slice(0, 10).join("\n\n");
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
