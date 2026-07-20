const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const datetimeTool = tool(
  async () => {
    return new Date().toString();
  },
  {
    name: "get_current_datetime",
    description: "Retrieve the current local date and time. Useful when answering temporal queries like 'today', 'current date', 'time now', etc.",
    schema: z.object({}),
  }
);

module.exports = { datetimeTool };
