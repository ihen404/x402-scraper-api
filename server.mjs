import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Catch uncaught exceptions to prevent silent crashes
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
});

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
      description: "Scrape, parse, and extract clean text content from a given web URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target web URL to scrape" }
        },
        required: ["url"]
      }
    }
  ]
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "scrape") {
    const { url } = request.params.arguments || {};

    if (!url) {
      throw new Error("URL argument is required");
    }

    try {
      console.log(`[Scraper] Fetching URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `HTTP Error ${response.status}: ${response.statusText}` }]
        };
      }

      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : "No title found";

      let cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

      let bodyText = cleanHtml.replace(/<[^>]+>/g, " ");

      bodyText = bodyText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n")
        .replace(/ +/g, " ");

      const truncatedText = bodyText.slice(0, 10000);

      return {
        content: [
          {
            type: "text",
            text: `TITLE: ${pageTitle}\nURL: ${url}\n\nCONTENT:\n${truncatedText}${bodyText.length > 10000 ? "\n\n[Content truncated...]" : ""}`
          }
        ]
      };
    } catch (err) {
      console.error(`Error scraping ${url}:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: `Scraping failed: ${err.message}` }]
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

app.get("/", (req, res) => {
  res.status(200).send("x402 Scraper MCP Server is live and healthy");
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

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    return res.status(400).send("No active MCP connection session for sessionId: " + sessionId);
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (err) {
    console.error("Error handling post message:", err);
    if (!res.headersSent) {
      res.status(500).send("Error processing message");
    }
  }
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP Server running on port ${PORT}`);
});
