import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Define multi-tiered tool list for JSON-RPC tools/list and server-card
const toolDefinitions = [
  {
    name: "scrape_basic",
    description: "Fast DOM parsing and clean Markdown extraction from static or server-rendered HTML. [x402 Protocol: $0.01 USDC on Base]",
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
    description: "Renders JavaScript-heavy dynamic web pages (SPAs, React apps, dynamic tables) using full headless browser simulation. [x402 Protocol: $0.05 USDC on Base]",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to render and scrape" },
        waitForMs: { type: "number", description: "Optional delay in ms to allow dynamic content/JS to load (default: 2000)" }
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
    description: "Scrapes a web page and parses raw content directly into a requested JSON schema format (e.g. products, contact details, pricing). [x402 Protocol: $0.15 USDC on Base]",
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
        extractedData: { type: "object", description: "Extracted data structured strictly according to jsonSchema" },
        url: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  }
];

// Write updated server-card generator or route updates
console.log("[Success] Tiered tool definitions generated.");
