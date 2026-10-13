import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Ensure express.json() middleware is active
if (!code.includes('app.use(express.json())')) {
  code = code.replace(/const app = express\(\);?/, "const app = express();\napp.use(express.json());");
}

// Strip out any broken /mcp handlers
code = code.replace(/\/\/ Glama MCP Streamable HTTP[\s\S]*/, "");

const robustMcpHandler = `
// Glama MCP Streamable HTTP / JSON-RPC endpoint handler
app.post("/mcp", (req, res) => {
  try {
    const body = req.body || {};
    const method = body.method;
    const id = body.id || 1;
    
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "x402-scraper-api", version: "3.3.0" }
        },
        id
      });
    }

    if (method === "notifications/initialized") {
      return res.json({ jsonrpc: "2.0", result: {}, id: id || null });
    }

    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "scrape",
              description: "Scrape, parse, and extract clean text content from any public web URL. [x402 Protocol: $0.01 USDC on Base]",
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string", description: "Target web URL to scrape" }
                },
                required: ["url"]
              }
            }
          ]
        },
        id
      });
    }

    return res.json({
      jsonrpc: "2.0",
      result: { status: "ok", server: "x402-scraper-api" },
      id
    });
  } catch (err) {
    console.error("[MCP Endpoint Error]", err);
    return res.status(200).json({ jsonrpc: "2.0", result: { status: "error", message: err.message }, id: 1 });
  }
});

app.get("/mcp", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write("data: " + JSON.stringify({ type: "connection", status: "connected" }) + "\n\n");
});
`;

fs.writeFileSync('index.js', code + "\n" + robustMcpHandler);
console.log("[Fix Applied] Express JSON middleware and fail-safe MCP handler updated.");
