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
  max: 500,
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
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
  message: {
    error: "Too Many Requests",
    message: "Rate limit exceeded. Maximum 60 requests per minute."
  }
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
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  let bodyText = cleanHtml.replace(/<[^>]+>/g, " ");
  bodyText = bodyText.split("\n").map(l => l.trim()).filter(l => l.length > 0).join("\n").replace(/ +/g, " ");

  const truncatedText = bodyText.slice(0, 10000);
  return {
    isError: false,
    text: `TITLE: ${pageTitle}\nURL: ${url}\n\nCONTENT:\n${truncatedText}${bodyText.length > 10000 ? "\n\n[Content truncated...]" : ""}`
  };
}

function createMcpServer() {
  const server = new Server(
    { name: "x402-scraper-api", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "scrape") {
      const { url } = request.params.arguments || {};
      if (!url) throw new Error("URL argument is required");
      const result = await scrapeUrl(url);
      return { isError: result.isError, content: [{ type: "text", text: result.text }] };
    }
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  return server;
}

app.get("/", (req, res) => res.status(200).send("x402 Scraper MCP Server is live and healthy"));

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
      { path: "/mcp", method: "POST", type: "mcp_streamable_http", description: "MCP Streamable HTTP endpoint" },
      { path: "/api/scrape", method: "POST", type: "http_402", description: "Direct REST HTTP 402 scraping endpoint" }
    ]
  });
});

app.post("/api/scrape", apiLimiter, authenticateApiKey, express.json(), async (req, res) => {
  const paymentProof = req.headers["x-402-payment-proof"] || req.headers["authorization"];
  const { url } = req.body || {};
  
  if (!url) return res.status(400).json({ error: "Missing 'url' parameter in JSON body" });

  if (!paymentProof) {
    res.setHeader("X-402-Price-USD", X402_CONFIG.pricePerRequestUsd);
    res.setHeader("X-402-Network", X402_CONFIG.network);
    res.setHeader("X-402-Token", X402_CONFIG.token);
    res.setHeader("X-402-Payment-Address", X402_CONFIG.paymentAddress);
    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires an x402 USDC payment proof transaction hash on Base",
      x402: { price_usd: X402_CONFIG.pricePerRequestUsd, network: X402_CONFIG.network, token: X402_CONFIG.token, payment_address: X402_CONFIG.paymentAddress }
    });
  }

  const cacheKey = `${paymentProof}:${url}`;
  if (scrapeCache.has(cacheKey)) {
    console.log(`[Cache] Returning cached result for idempotent request: ${url}`);
    return res.status(200).json({ url, result: scrapeCache.get(cacheKey), cached: true });
  }

  const verification = await verifyOnChainPayment(paymentProof);
  if (!verification.valid) {
    return res.status(402).json({
      error: "Invalid Payment Proof",
      message: verification.error,
      x402: { price_usd: X402_CONFIG.pricePerRequestUsd, network: X402_CONFIG.network, token: X402_CONFIG.token, payment_address: X402_CONFIG.paymentAddress }
    });
  }

  const result = await scrapeUrl(url);
  if (result.isError) return res.status(502).json({ error: result.text });

  scrapeCache.set(cacheKey, result.text);
  return res.status(200).json({ url, result: result.text, cached: false });
});

app.all("/mcp", apiLimiter, async (req, res) => {
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

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => console.log(`MCP Server running on port ${PORT}`));
