# 🚀 x402 Scraper & Intelligence MCP Server

A production-grade, container-stable Model Context Protocol (MCP) server hosted on Railway. It combines multi-modal scraping, advanced semantic search (RAG), browser automation macros, real-time usage metrics, and native Base network (`eip155:8453`) USDC micropayment gating via the `x402` open standard.

---

### 1. Quick Connection (MCP Clients)
To plug this server directly into your AI client (such as Claude Desktop or custom agent runners) via **Streamable HTTP** transport, add the following block to your `mcp.json` or client configuration file:

```json
{
  "mcpServers": {
    "x402-scraper-api": {
      "transport": "streamable-http",
      "url": "https://x402-scraper-api-production-67a4.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      },
      "description": "Production-grade multi-modal scraper, RAG engine, browser automation, and onchain x402 micropayment gateway on Base network."
    }
  }
}
```

---

### 2. Available MCP Tools & Capabilities
Once connected, your AI agents have immediate access to 8 robust tools mapped via advanced Zod schemas:

| Tool Name | Description | Payment Gating / Protocol |
| :--- | :--- | :--- |
| `extract` | Extracts structured data from raw HTML using custom JSON schemas. | Standard Auth / Free Tier |
| `crawl` | Recursively crawls web pages up to a defined depth and limit. | Standard Auth / Free Tier |
| `render` | Renders dynamic Single Page Applications (SPAs) and cleans markup. | Standard Auth / Free Tier |
| `screenshot` | Captures high-fidelity visual snapshots of target web pages. | **`x402` Base Mainnet USDC** ($0.0015) |
| `pdf` | Generates document snapshots of web pages. | **`x402` Base Mainnet USDC** |
| `search_rag` | Performs semantic search & RAG retrieval over target URLs using AI. | **`x402` Base Mainnet USDC** ($0.0025) |
| `automate` | Executes multi-step browser automation macros (click, type, scroll). | **`x402` Base Mainnet USDC** ($0.0035) |
| `get_analytics` | Pulls real-time request counts, status breakdowns, and volume metrics. | Admin API Key Protected |

---

### 3. Direct REST API Examples

#### A. Standard Extraction (`POST /api/extract`)
```bash
curl -X POST https://x402-scraper-api-production-67a4.up.railway.app/api/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com",
    "schema": { "type": "object", "properties": { "title": { "type": "string" } } },
    "instruction": "Extract the main title heading."
  }'
```

#### B. Triggering an x402 Payment Challenge (`POST /api/screenshot`)
Hitting a premium endpoint without a signature returns an immediate `402 Payment Required` header with Base Mainnet (`eip155:8453`) contract details:
```bash
curl -i -X POST https://x402-scraper-api-production-67a4.up.railway.app/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```
