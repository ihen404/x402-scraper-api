import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Add the well-known server card route if not already present
const serverCardRoute = `
// Static Server Card for Smithery publisher auto-discovery
app.get("/.well-known/mcp/server-card.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    schemaVersion: "1.0",
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.4.0",
      description: "Enterprise web scraping MCP server with automated x402 micro-payment negotiation on Base Mainnet.",
      homepage: "https://github.com/ihen404/x402-scraper-api"
    },
    transport: {
      type: "streamable-http",
      endpoint: "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
    },
    capabilities: {
      tools: true
    },
    tools: [
      {
        name: "scrape",
        description: "Scrape, parse, and extract clean text content from any public web URL. [x402 Protocol: $0.01 USDC on Base Mainnet]",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target web URL to scrape" }
          },
          required: ["url"]
        },
        outputSchema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            content: { type: "string", description: "Extracted clean markdown content" },
            url: { type: "string" }
          }
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true
        }
      }
    ]
  });
});

// Also add a root health check so root requests don't 404
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "x402-scraper-api",
    mcpEndpoint: "/mcp",
    serverCard: "/.well-known/mcp/server-card.json"
  });
});
`;

if (!code.includes('/.well-known/mcp/server-card.json')) {
  fs.writeFileSync('index.js', code + "\n" + serverCardRoute);
  console.log("[Success] Server card route added to index.js.");
}
