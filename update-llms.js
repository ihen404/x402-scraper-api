import fs from 'fs';

// Read existing server.js to patch in llms.txt endpoints
let code = fs.readFileSync('server.js', 'utf8');

const llmsEndpoints = `
// Phase 1: AI Agent Discovery Specifications (llms.txt v2 Standard)
app.get('/llms.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(\`# x402 Scraper API

> Multi-tiered web scraping MCP server accepting x402 USDC micro-payments on Base Mainnet (Chain ID 8453). Designed for autonomous AI agent swarms and data pipelines.

## Endpoints & Discovery
- [Server Card JSON](https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp/server-card.json): MCP server discovery card.
- [Telemetry Dashboard](https://x402-scraper-api-production-67a4.up.railway.app/telemetry): Live dual-channel on-chain and test request metrics.
- [Full Documentation Spec](https://x402-scraper-api-production-67a4.up.railway.app/llms-full.txt): Complete concatenated API reference and schemas.

## Pricing Tiers (x402 USDC on Base)
- scrape_basic ($0.01 USDC): Clean Markdown extraction for static web pages.
- scrape_dynamic ($0.05 USDC): Headless browser rendering for JS-heavy dynamic sites.
- scrape_structured ($0.15 USDC): AI-extracted structured JSON data matching custom schemas.
\`);
});

app.get('/llms-full.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(\`# x402 Scraper API - Full Documentation & Integration Guide

> Comprehensive technical reference for autonomous agents integrating with the x402 Scraper API on Base Mainnet.

## 1. Authentication & x402 Protocol
All tool requests to \`/mcp\` must comply with the HTTP 402 Payment Required standard. 
- Network: Base Mainnet (RPC: https://mainnet.base.org)
- Receiver Wallet: 0xD4fd01ce7B0131eD77342d0375507110742EB925
- Payment Asset: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

When a request is made without a valid \`PAYMENT-SIGNATURE\` header, the server returns status \`402\` with payment challenge parameters.

## 2. MCP Tools Reference
### scrape_basic
- Price: $0.01 USDC
- Input: \`{ "url": "https://example.com" }\`
- Output: Markdown string of page content.

### scrape_dynamic
- Price: $0.05 USDC
- Input: \`{ "url": "https://example.com", "waitFor": 2000 }\`
- Output: Rendered HTML converted to clean Markdown.

### scrape_structured
- Price: $0.15 USDC
- Input: \`{ "url": "https://example.com", "schema": { "title": "string", "price": "number" } }\`
- Output: Validated JSON matching requested schema.
\`);
});
`;

// Insert before app.listen
if (!code.includes('/llms.txt')) {
  code = code.replace('const PORT', llmsEndpoints + '\nconst PORT');
  fs.writeFileSync('server.js', code);
  console.log('[Success] Added /llms.txt and /llms-full.txt to server.js');
} else {
  console.log('[Info] /llms.txt already present in server.js');
}
