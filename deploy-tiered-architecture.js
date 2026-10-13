import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Define multi-tiered tool list
const tieredTools = [
  {
    name: "scrape_basic",
    description: "Fast DOM parsing and clean Markdown extraction from static HTML. [x402 Protocol: $0.01 USDC on Base]",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to scrape" }
      },
      required: ["url"]
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        content: { type: "string", description: "Clean Markdown body text" },
        url: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    name: "scrape_dynamic",
    description: "Renders JavaScript-heavy dynamic web pages (SPAs, React apps) using headless browser simulation. [x402 Protocol: $0.05 USDC on Base]",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to render and scrape" },
        waitForMs: { type: "number", description: "Delay in ms to allow dynamic JS loading (default: 2000)" }
      },
      required: ["url"]
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        content: { type: "string" },
        url: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    name: "scrape_structured",
    description: "Scrapes a web page and parses raw content directly into a requested JSON schema format. [x402 Protocol: $0.15 USDC on Base]",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to extract structured data from" },
        jsonSchema: { type: "object", description: "Target JSON Schema object for extraction" }
      },
      required: ["url", "jsonSchema"]
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        extractedData: { type: "object", description: "Extracted data structured according to jsonSchema" },
        url: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  }
];

// 1. Update Server Card with Tiered Tools
const serverCardCode = `
app.get("/.well-known/mcp/server-card.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    schemaVersion: "1.0",
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.5.0",
      description: "Multi-tiered web scraping MCP server with automated x402 micro-payments on Base Mainnet ($0.01 - $0.15 USDC).",
      homepage: "https://github.com/ihen404/x402-scraper-api"
    },
    transport: {
      type: "streamable-http",
      endpoint: "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
    },
    capabilities: { tools: true },
    tools: ${JSON.stringify(tieredTools, null, 2)}
  });
});
`;

// Replace existing server card route
code = code.replace(/app\.get\("\/\.well-known\/mcp\/server-card\.json"[\s\S]*?\n\}\);\n/g, serverCardCode + "\n");

// 2. Add Tiered Telemetry Counters
if (!code.includes("mcpToolCallsBasic")) {
  code = code.replace("mcpToolCalls: 0,", "mcpToolCalls: 0,\n  mcpToolCallsBasic: 0,\n  mcpToolCallsDynamic: 0,\n  mcpToolCallsStructured: 0,");
}

fs.writeFileSync('index.js', code);
console.log("[Success] Multi-tiered server card and telemetry structure updated.");
