import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

const mcpServer = new Server(
  {
    name: "x402-scraper-api",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scrape",
        description: "Scrapes web page title and text content from a given URL.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to scrape" },
          },
          required: ["url"],
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "scrape") {
    const url = request.params.arguments?.url;
    if (!url) {
      throw new Error("URL parameter is required.");
    }

    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || $('h1').first().text().trim() \vert{}\vert{} 'No Title Found';$('script, style, nav, footer, header').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ url, title, textSnippet: text }, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to scrape URL ${url}: ${err.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

let transport;

app.get("/mcp", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
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
