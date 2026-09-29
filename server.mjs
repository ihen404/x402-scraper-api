import express from "express";
import { Readable } from "stream";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

const mcpServer = new Server(
  { name: "x402-scraper-api", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const transports = new Map();

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scrape",
      description: "Scrape and extract text content from a given web URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL to scrape" }
        },
        required: ["url"]
      }
    }
  ]
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "scrape") {
    const { url } = request.params.arguments || {};
    return {
      content: [{ type: "text", text: `Scrape request received for URL: ${url}` }]
    };
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

app.get("/", (req, res) => {
  res.send("x402 Scraper MCP Server is live");
});

app.get("/mcp", async (req, res) => {
  console.log("New SSE connection requested on /mcp");
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  transport.onclose = () => {
    console.log(`Transport session ${transport.sessionId} closed`);
    transports.delete(transport.sessionId);
  };

  await mcpServer.connect(transport);
});

// Reconstruct readable stream from parsed req.body
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    return res.status(400).send("No active MCP connection session for sessionId: " + sessionId);
  }

  try {
    // Convert parsed JSON body back into an unconsumed Readable Stream
    const bodyString = JSON.stringify(req.body);
    const stream = Readable.from([bodyString]);

    // Attach request metadata expected by the SDK
    stream.headers = req.headers;
    stream.method = req.method;
    stream.url = req.url;

    await transport.handlePostMessage(stream, res);
  } catch (err) {
    console.error("Error handling post message:", err);
    if (!res.headersSent) {
      res.status(500).send("Error processing message");
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP Server running on port ${PORT}`);
});
