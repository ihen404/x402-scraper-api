import "dotenv/config";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { LRUCache } from "lru-cache";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

app.use((req, res, next) => {
  console.log(`[Incoming Request] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
  // Force-inject required accept headers globally for any MCP client / test runner
  if (req.path === '/' || req.path === '/mcp' || req.path.startsWith('/mcp')) {
    req.headers['accept'] = 'application/json, text/event-stream';
    if (!req.headers['content-type']) {
      req.headers['content-type'] = 'application/json';
    }
  }

  if (req.url.includes('/mcp](https://')) {
    req.url = '/mcp';
  }
  next();
});
app.set("trust proxy", 1);

const walletAddress =
  process.env.PAYMENT_WALLET_ADDRESS ||
  process.env.payment_wallet_address ||
  process.env.X402_PAYMENT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

const EXPECTED_API_KEY = process.env.API_KEY || null;
const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org")
});

const scrapeCache = new LRUCache({
  max: 300,
  ttl: 10 * 60 * 1000, 
});

const X402_CONFIG = {
  version: "1.0",
  name: "x402 Scraper API",
  description: "High-performance web scraping and text extraction service for autonomous AI agents",
  network: "base",
  paymentAddress: walletAddress,
  pricePerRequestUsd: "0.001",
  token: "USDC"
};

const apiLimiter = rateLimit({
  skip: (req) => {
    const ua = req.headers['user-agent'] || '';
    // Skip rate limiting for Glama, MCP inspectors, and common test agents
    return ua.includes('Glama') || ua.includes('MCP') || ua.includes('curl') || ua.includes('Postman');
  },
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too Many Requests", message: "Rate limit exceeded. Maximum 300 requests per minute." }
  });

function authenticateApiKey(req, res, next) {
  if (!EXPECTED_API_KEY) return next();
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing 'x-api-key' header." });
  }
  next();
}

async function verifyOnChainPayment(txHash) {
  if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
    return { valid: false, error: "Invalid transaction hash format" };
  }

  if (walletAddress === "0x0000000000000000000000000000000000000000") {
    console.warn("[x402] Warning: Using zero address wallet. Bypassing on-chain check.");
    return { valid: true };
  }

  try {
    const txReceipt = await baseClient.getTransactionReceipt({ hash: txHash });
    if (!txReceipt || txReceipt.status !== "success") {
      return { valid: false, error: "Transaction failed or not found on Base" };
    }

    let verified = false;
    for (const log of txReceipt.logs) {
      if (log.address.toLowerCase() === USDC_BASE_ADDRESS.toLowerCase()) {
        try {
          const toAddress = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
          if (toAddress === walletAddress.toLowerCase()) {
            verified = true;
            break;
          }
        } catch (e) {}
      }
    }

    if (!verified) {
      return { valid: false, error: "No valid USDC transfer found to payment address in transaction logs" };
    }

    return { valid: true };
  } catch (err) {
    console.error("[x402] Verification error:", err);
    return { valid: false, error: `On-chain validation error: ${err.message}` };
  }
}

async function scrapeUrl(url) {
  console.log(`[Scraper] Fetching URL: ${url}`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    return { isError: true, text: `HTTP Error ${response.status}: ${response.statusText}` };
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : "No title found";

  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style[^<]*(?:(?!</style>)<[^<]*)*</style>/gi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20000);

    res.json({
      success: true,
      url,
      rendered: true,
      data: {
        title,
        content: cleanContent,
        rawLength: html.length
      },
      metadata: {
        renderedAt: new Date().toISOString(),
        costUsdc: "0.0030"
      }
    });
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({ error: "Render Failed", message: error.message });
  }
});

app.post("/", handleMcpTransport);



app.get("/mcp", handleMcpTransport);


app.all("/mcp", async (req, res) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling Streamable HTTP request on /mcp:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  }
});

const PORT = parseInt(process.env.PORT || "8080", 10);
app.listen(PORT, "0.0.0.0", () => console.log(`MCP Server running on port ${PORT}`));

app.all(/^\/mcp\]\(https:\/\//, (req, res) => {
  req.url = "/mcp";
  return app._router.handle(req, res);
});


// Glama auto-discovery manifest
app.get('/.well-known/glama.json', (req, res) => {
  res.json({
    "name": "x402-scraper-api",
    "description": "MCP Scraper API with USDC microtransactions on Base",
    "transport": {
      "type": "streamable-http",
      "url": "https://x402-scraper-api-production-67a4.up.railway.app/"
    }
  });
});
