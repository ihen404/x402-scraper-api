import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

// Configuration for x402 Payment Protocol
const X402_CONFIG = {
  version: "1.0",
  name: "x402 Scraper API",
  description: "High-performance web scraping and text extraction service for autonomous AI agents",
  network: "base",
  paymentAddress: process.env.X402_PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000",
  pricePerRequestUsd: "0.001",
  token: "USDC"
};

const mcpServer = new Server(
  { name: "x402-scraper-api", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const transports = new Map();

// Helper to perform text extraction
async function scrapeUrl(url) {
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
      text: `HTTP Error ${response.status}: ${response.statusText}`
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
    isError: false,
    text: `TITLE: ${pageTitle}\nURL: ${url}\n\nCONTENT:\n${truncatedText}${bodyText.length > 10000 ? "\n\n[Content truncated...]" : ""}`
  };
}

// MCP Tools Declaration with x402 Pricing Metadata
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scrape",
      description: "Scrape, parse, and extract clean text content from any public web URL. [x402 Protocol: $0.001 USDC on Base]",
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
      const result = await scrapeUrl(url);
      return {
        isError: result.isError,
        content: [{ type: "text", text: result.text }]
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

// Root Health Check
app.get("/", (req, res) => {
  res.status(200).send("x402 Scraper MCP Server is live and healthy");
});

// 1. Agent Discovery Manifest (.well-known/x402)
app.get("/.well-known/x402", (req, res) => {
  res.status(200).json({
    x402_version: X402_CONFIG.version,
    name: X402_CONFIG.name,
    description: X402_CONFIG.description,
    network: X402_CONFIG.network,
    payment_address: X402_CONFIG.paymentAddress,
    price_per_request_usd: X402_CONFIG.pricePerRequestUsd,
    accepted_tokens: [X402_CONFIG.token],
    endpoints: [
      {
        path: "/mcp",
        method: "GET",
        type: "sse",
        description: "MCP Server-Sent Events transport endpoint"
      },
      {
        path: "/messages",
        method: "POST",
        type: "mcp_rpc",
        description: "MCP Message RPC endpoint"
      },
      {
        path: "/api/scrape",
        method: "POST",
        type: "http_402",
        description: "Direct REST HTTP 402 scraping endpoint"
      }
    ]
  });
});

// 2. Direct REST HTTP 402 Scraping Endpoint
app.post("/api/scrape", express.json(), async (req, res) => {
  const paymentProof = req.headers["x-402-payment-proof"] || req.headers["authorization"];

  // If no payment proof is provided, trigger the HTTP 402 Handshake
  if (!paymentProof) {
    res.setHeader("X-402-Price-USD", X402_CONFIG.pricePerRequestUsd);
    res.setHeader("X-402-Network", X402_CONFIG.network);
    res.setHeader("X-402-Token", X402_CONFIG.token);
    res.setHeader("X-402-Payment-Address", X402_CONFIG.paymentAddress);

    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires an x402 payment proof on Base",
      x402: {
        price_usd: X402_CONFIG.pricePerRequestUsd,
        network: X402_CONFIG.network,
        token: X402_CONFIG.token,
        payment_address: X402_CONFIG.paymentAddress
      }
    });
  }

  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' parameter in JSON body" });
  }

  try {
    const result = await scrapeUrl(url);
    if (result.isError) {
      return res.status(502).json({ error: result.text });
    }
    return res.status(200).json({ url, result: result.text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// MCP Transport Endpoints
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
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`MCP Server running at http://${HOST}:${PORT}`);
});
