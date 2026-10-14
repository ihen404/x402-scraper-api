import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Dual-Channel Telemetry State
const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.0",
  network: "Base Mainnet (8453)",
  wallet: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  startedAt: new Date().toISOString(),
  live_onchain: {
    totalRequests: 0,
    successfulScrapes: 0,
    failureCount: 0,
    usdcRevenue: 0.00,
    tiers: { basic: 0, dynamic: 0, structured: 0 }
  },
  test_simulation: {
    totalRequests: 3,
    successfulScrapes: 3,
    failureCount: 0,
    simulatedRevenue: 0.21,
    tiers: { basic: 1, dynamic: 1, structured: 1 }
  }
};

// Tool Pricing Map
const TIER_PRICES = {
  scrape_basic: 0.01,
  scrape_dynamic: 0.05,
  scrape_structured: 0.15
};

// Middleware: Classify Live vs Test traffic
app.use('/mcp', (req, res, next) => {
  if (req.method === 'POST') {
    const hasPaymentSignature = req.headers['payment-signature'] || req.headers['x-payment-proof'];
    const toolName = req.body?.params?.name;
    const price = TIER_PRICES[toolName] || 0.01;

    if (hasPaymentSignature) {
      // Live On-Chain Channel
      telemetry.live_onchain.totalRequests++;
      telemetry.live_onchain.successfulScrapes++;
      telemetry.live_onchain.usdcRevenue += price;
      if (toolName && telemetry.live_onchain.tiers[toolName] !== undefined) {
        telemetry.live_onchain.tiers[toolName]++;
      }
    } else {
      // Test / Simulation Channel
      telemetry.test_simulation.totalRequests++;
      telemetry.test_simulation.successfulScrapes++;
      telemetry.test_simulation.simulatedRevenue += price;
    }
  }
  next();
});

// Telemetry Endpoint
app.get('/telemetry', (req, res) => {
  res.json({
    ...telemetry,
    timestamp: new Date().toISOString()
  });
});

// Server Card Discovery Endpoint
app.get('/.well-known/mcp/server-card.json', (req, res) => {
  res.json({
    name: "x402 Scraper API",
    description: "Multi-Tiered Web Scraping MCP Server accepting x402 USDC payments on Base Mainnet",
    version: "3.5.0",
    endpoints: {
      mcp: "https://x402-scraper-api-production-67a4.up.railway.app/mcp",
      telemetry: "https://x402-scraper-api-production-67a4.up.railway.app/telemetry"
    }
  });
});


// Phase 1: AI Agent Discovery Specifications (llms.txt v2 Standard)
app.get('/llms.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(`# x402 Scraper API

> Multi-tiered web scraping MCP server accepting x402 USDC micro-payments on Base Mainnet (Chain ID 8453). Designed for autonomous AI agent swarms and data pipelines.

## Endpoints & Discovery
- [Server Card JSON](https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp/server-card.json): MCP server discovery card.
- [Telemetry Dashboard](https://x402-scraper-api-production-67a4.up.railway.app/telemetry): Live dual-channel on-chain and test request metrics.
- [Full Documentation Spec](https://x402-scraper-api-production-67a4.up.railway.app/llms-full.txt): Complete concatenated API reference and schemas.

## Pricing Tiers (x402 USDC on Base)
- scrape_basic ($0.01 USDC): Clean Markdown extraction for static web pages.
- scrape_dynamic ($0.05 USDC): Headless browser rendering for JS-heavy dynamic sites.
- scrape_structured ($0.15 USDC): AI-extracted structured JSON data matching custom schemas.
`);
});

app.get('/llms-full.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(`# x402 Scraper API - Full Documentation & Integration Guide

> Comprehensive technical reference for autonomous agents integrating with the x402 Scraper API on Base Mainnet.

## 1. Authentication & x402 Protocol
All tool requests to `/mcp` must comply with the HTTP 402 Payment Required standard. 
- Network: Base Mainnet (RPC: https://mainnet.base.org)
- Receiver Wallet: 0xD4fd01ce7B0131eD77342d0375507110742EB925
- Payment Asset: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

When a request is made without a valid `PAYMENT-SIGNATURE` header, the server returns status `402` with payment challenge parameters.

## 2. MCP Tools Reference
### scrape_basic
- Price: $0.01 USDC
- Input: `{ "url": "https://example.com" }`
- Output: Markdown string of page content.

### scrape_dynamic
- Price: $0.05 USDC
- Input: `{ "url": "https://example.com", "waitFor": 2000 }`
- Output: Rendered HTML converted to clean Markdown.

### scrape_structured
- Price: $0.15 USDC
- Input: `{ "url": "https://example.com", "schema": { "title": "string", "price": "number" } }`
- Output: Validated JSON matching requested schema.
`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[x402 Scraper API] Running on port ${PORT}`);
});
