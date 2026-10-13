# 🌐 x402 Scraper API

> **High-Velocity, Multi-Tiered Web Scraping MCP Server** monetized via HTTP 402 micro-payments on **Base Mainnet**. Designed for autonomous agent swarms, research pipelines, and enterprise LLM workflows.

---

## ⚡ Quickstart for Developers (Claude Desktop / MCP Clients)

Add this server configuration to your MCP client settings file (e.g., `claude_desktop_config.json`) to instantly equip your local AI workspace with paid web scraping tools:

```json
{
  "mcpServers": {
    "x402-scraper": {
      "command": "npx",
      "args": ["-y", "x402-scraper-api"],
      "env": {
        "BASE_RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

---

## 🛠️ Tool Tiers & Pricing

Our scraping infrastructure offers three distinct programmatic tiers tailored for autonomous agents:

| Tool Name | Description | Price (USDC on Base) |
| :--- | :--- | :--- |
| **`scrape_basic`** | Fast DOM parsing & clean Markdown extraction from static HTML. | **$0.01** |
| **`scrape_dynamic`** | Headless browser rendering for JavaScript-heavy, dynamic web apps. | **$0.05** |
| **`scrape_structured`** | Scrapes a web page and parses raw content directly into a requested JSON Schema. | **$0.15** |

---

## 🤖 Autonomous Agent Integration (M2M / x402 Protocol)

Autonomous scout agents and agent swarms can programmatically discover tool definitions via our server card and execute x402 payment challenges on the fly. 

### Direct Endpoint Usage
* **Base URL**: `https://x402-scraper-api-production-67a4.up.railway.app`
* **MCP Gateway**: `https://x402-scraper-api-production-67a4.up.railway.app/mcp`
* **Server Card**: `https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp/server-card.json`
* **Telemetry**: `https://x402-scraper-api-production-67a4.up.railway.app/telemetry`

### Sample JavaScript Client Request
Agents can invoke tools using standard JSON-RPC over HTTP:

```javascript
const response = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "scrape_structured",
      arguments: {
        url: "https://example.com/target-data",
        jsonSchema: { title: "string", price: "number" }
      }
    },
    id: 1
  })
});

const result = await response.json();
console.log(result);
```

---

## 📊 Live Telemetry & Monitoring

Our production infrastructure maintains real-time telemetry tracking request velocity, active sessions, and revenue milestones. Inspect current uptime and metrics programmatically:

```bash
curl -s https://x402-scraper-api-production-67a4.up.railway.app/telemetry
```

## 🚀 License
MIT © 2026 x402 Scraper API
