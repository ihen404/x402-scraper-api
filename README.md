# x402-scraper-api

An open Model Context Protocol (MCP) server providing web scraping capabilities integrated with x402 dynamic micro-payment discovery ($0.01 USDC per call on Base Mainnet).

## Installation for AI Clients

Add this configuration to your `claude_desktop_config.json` or MCP client settings:

\`\`\`json
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
\`\`\`

## Hosted Streamable HTTP Endpoint
- **Glama / Smithery Endpoint**: `https://x402-scraper-api-production-67a4.up.railway.app/mcp`
