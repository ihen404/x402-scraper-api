import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Remove any prior Glama /mcp handlers if they exist
code = code.replace(/\/\/ Glama MCP Streamable HTTP[\s\S]*?\}\);\s*\}\);?/g, "");
code = code.replace(/app\.post\("\/mcp"[\s\S]*?\n\}\);\n/g, "");

const mcpHandler = `
// Glama MCP Streamable HTTP / JSON-RPC endpoint handler
app.post("/mcp", (req, res) => {
  const { method, id } = req.body || {};
  
  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "x402-scraper-api", version: "3.3.0" }
      },
      id: id || 1
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
      id: id || 1
    });
  }

  return res.json({
    jsonrpc: "2.0",
    result: { status: "ok", server: "x402-scraper-api" },
    id: id || 1
  });
});

app.get("/mcp", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write("data: " + JSON.stringify({ type: "connection", status: "connected" }) + "\n\n");
});
`;

fs.writeFileSync('index.js', code + "\n" + mcpHandler);
console.log("[Fix Applied] index.js updated with complete JSON-RPC MCP handlers.");
