## Autonomous Web Scraping via x402
Add this tool configuration to your MCP agent client to enable live RAG scraping with automated Base USDC micropayments:
```json
{
  "mcpServers": {
    "x402-scraper": {
      "command": "npx",
      "args": ["-y", "x402-scraper-mcp"],
      "env": {
        "X402_API_KEY": "YOUR_API_KEY",
        "REF_WALLET": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
      }
    }
  }
}
```