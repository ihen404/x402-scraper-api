import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

const mcpServer = new Server(
  { name: "x402-scraper-api", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const transports = new Map();

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scrape",
      description: "Scrape a given URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"]
      }
    }
  ]
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "scrape") {
    const { url } = request.params.arguments || {};
    try {
      return {
        content: [{ type: "text", text: `Successfully received scrape request for ${url}` }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to scrape URL ${url}: ${err.message}` }],
        isError: true
      };
    }
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

app.get("/mcp", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  transport.onclose = () => {
    transports.delete(transport.sessionId);
  };

  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId) || Array.from(transports.values())[0];

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active MCP connection");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP Server running on port ${PORT}`);
});
