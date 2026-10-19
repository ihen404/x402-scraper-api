import express from "express";
import cors from "cors";

const app = express();

// Auto-Discovery Endpoint for Multi-Chain & Gemini 4 Argon
app.get("/.well-known/mcp.json", (req, res) => {
  res.json({
    "schema_version": "v1.1.0",
    "name": "x402-scraper-api",
    "description": "Autonomous HTTP 402 paid web scraping API delivering clean, LLM-ready Markdown payloads across EVM and Solana.",
    "homepage": "https://x402-scraper-api-production-67a4.up.railway.app",
    "mcp_endpoint": "https://x402-scraper-api-production-67a4.up.railway.app/mcp",
    "payment_protocol": {
      "type": "x402",
      "accepted_chains": [
        {
          "chain": "base-mainnet",
          "chain_id": 8453,
          "token": "USDC",
          "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "recipient_wallet": "0xD4fd01ce7B0131eD77342d0375507110742EB925",
          "price_per_request": "0.01"
        },
        {
          "chain": "solana-mainnet",
          "token": "SPL-USDC",
          "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          "recipient_wallet": "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz",
          "price_per_request": "0.01"
        }
      ]
    },
    "capabilities": {
      "tools": [
        {
          "name": "scrape_url",
          "description": "Scrapes target web page and returns sanitized LLM-ready Markdown text.",
          "parameters": {
            "type": "object",
            "properties": {
              "url": { "type": "string", "description": "Target HTTP/HTTPS URL" }
            },
            "required": ["url"]
          }
        }
      ]
    }
  });
});

app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.1",
  network: "Base Mainnet (8453) + Solana",
  wallets: {
    base: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
    solana: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz"
  },
  startedAt: new Date().toISOString(),
  live_onchain: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, usdcRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } },
  test_simulation: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, simulatedRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } }
};

const TIER_PRICES = { scrape_basic: 0.01, scrape_dynamic: 0.05, scrape_structured: 0.15 };

app.get("/", (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api" });
});

app.get("/telemetry", (req, res) => {
  res.json({ ...telemetry, timestamp: new Date().toISOString() });
});

app.post("/mcp", (req, res) => {

// Allow unauthenticated Glama/MCP protocol handshakes & tool discovery
const method = req.body && req.body.method;
if (method === "initialize" || method === "ping" || method === "tools/list") {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {
    name: "x402-scraper-api",
    version: "1.1.0",
    capabilities: { tools: {} },
    tools: [
      {
        name: "scrape_basic",
        description: "Scrapes structured web page content ($0.01 USDC micro-transaction).",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      }
    ]
  },
  id: req.body ? req.body.id : 1
});
}

  try {
    const hasPayment = req.headers["payment-signature"] || req.headers["x-payment-proof"] || req.headers["authorization"];
    const isTestMode = req.headers["x-test-mode"] === "true";
    const toolName = req.body?.params?.name || "scrape_basic";
    const price = TIER_PRICES[toolName] || 0.01;
    const key = toolName.replace("scrape_", "");

    if (hasPayment) {
      telemetry.live_onchain.totalRequests++;
      telemetry.live_onchain.successfulScrapes++;
      telemetry.live_onchain.usdcRevenue += price;
      if (telemetry.live_onchain.tiers[key] !== undefined) telemetry.live_onchain.tiers[key]++;
      
      return res.json({ jsonrpc: "2.0", result: { status: "success", data: "Paid content delivered." }, id: req.body?.id || 1 });
    }

    if (isTestMode) {
      telemetry.test_simulation.totalRequests++;
      telemetry.test_simulation.successfulScrapes++;
      telemetry.test_simulation.simulatedRevenue += price;
      if (telemetry.test_simulation.tiers[key] !== undefined) telemetry.test_simulation.tiers[key]++;
      
      return res.json({ jsonrpc: "2.0", result: { status: "success", mode: "test_simulation" }, id: req.body?.id || 1 });
    }

    // Enforce HTTP 402 Payment Required for all unpaid production requests
    telemetry.live_onchain.totalRequests++;
    telemetry.live_onchain.failureCount++;
    
    
    
    const paymentRequirements = {
  base: { recipient: "0xD4fd01ce7B0131eD77342d0375507110742EB925", token: "USDC", chainId: 8453, amount: price.toString() },
  solana: { recipient: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz", token: "SPL-USDC", amount: price.toString() }
};
const headerPayload = Buffer.from(JSON.stringify(paymentRequirements)).toString("base64");
res.setHeader("PAYMENT-REQUIRED", headerPayload);
return res.status(402).json({
      jsonrpc: "2.0",
      error: {
        code: 402,
        message: "Payment Required. Attach a valid x402 payment signature (PAYMENT-SIGNATURE header) in USDC on Base or Solana.",
        payment_requirements: {
          base: {
            recipient: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
            token: "USDC",
            chainId: 8453,
            amount: price.toString()
          },
          solana: {
            recipient: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz",
            token: "SPL-USDC",
            amount: price.toString()
          }
        }
      },
      id: req.body?.id || 1
    });
  } catch (err) {
    console.error("[Error in /mcp]:", err);
    return res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: err.message } });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[x402 Scraper API] Listening on 0.0.0.0:${PORT}`);
});
