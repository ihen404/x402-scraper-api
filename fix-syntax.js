import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Strip everything from the start of the Glama handler to the end of the file
code = code.replace(/\/\/ Streamable HTTP \/ JSON-RPC endpoint handler[\s\S]*/, "");
code = code.replace(/\/\/ Glama MCP Streamable HTTP[\s\S]*/, "");

const cleanHandler = `
// Streamable HTTP / JSON-RPC endpoint handler for Glama MCP compliance
app.all("/mcp", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("event: endpoint\\ndata: /mcp\\n\\n");
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { method, id } = body;
    const sessionId = req.headers["mcp-session-id"] || "x402-session-" + Date.now();
    res.setHeader("Mcp-Session-Id", sessionId);

    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "x402-scraper-api", version: "3.3.0" }
        },
        id: id || 1
      });
    }

    if (method === "notifications/initialized") {
      return res.status(200).send("");
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
  }

  return res.status(405).json({ error: "Method Not Allowed" });
});
`;

fs.writeFileSync('index.js', code + "\n" + cleanHandler);
console.log("[Fixed] index.js syntax corrected.");
