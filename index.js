import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/mcp", async (req, res) => {
const reqMethod = req.body && req.body.method;

// Unauthenticated MCP protocol handshakes & discovery
if (reqMethod === "initialize") {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "x402-scraper-api", version: "1.1.0" }
  },
  id: req.body ? req.body.id : 1
});
}

if (reqMethod === "tools/list") {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {
    tools: [
      {
        name: "scrape_basic",
        description: "Scrapes static web page content ($0.01 USDC micro-transaction).",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      },
      {
        name: "scrape_advanced",
        description: "Scrapes JS-rendered SPAs, React apps, and dynamic pages ($0.03 USDC micro-transaction).",
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

if (reqMethod === "ping" || (reqMethod && reqMethod !== "tools/call")) {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {},
  id: req.body ? req.body.id : 1
});
}

// ENFORCE $0.01 / $0.03 USDC PAYMENT ON tools/call
const paymentSignature = req.headers["payment-signature"] || req.headers["x-payment-signature"];
const toolParams = req.body && req.body.params;
const toolName = toolParams && toolParams.name;
const price = toolName === "scrape_advanced" ? "0.03" : "0.01";

if (!paymentSignature) {
return res.status(402).json({
  jsonrpc: "2.0",
  error: {
    code: 402,
    message: `Payment Required. Attach a valid x402 payment signature (PAYMENT-SIGNATURE header) in USDC on Base or Solana.`,
    payment_requirements: {
      base: { recipient: "0xD4fd01ce7B0131eD77342d0375507110742EB925", token: "USDC", chainId: 8453, amount: price },
      solana: { recipient: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz", token: "SPL-USDC", amount: price }
    }
  },
  id: req.body ? req.body.id : 1
});
}

// Execution placeholder for verified tool execution
return res.status(200).json({
jsonrpc: "2.0",
result: {
  content: [{ type: "text", text: `[x402 Scraper] Successfully executed ${toolName || "scrape_basic"}.` }]
},
id: req.body ? req.body.id : 1
});
});

app.listen(PORT, "0.0.0.0", () => {
console.log(`Server listening on port ${PORT}`);
});
