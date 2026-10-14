import fs from 'fs';

let serverCode = fs.readFileSync('server.js', 'utf8');

// Update middleware to exempt standard MCP initialization/discovery pings
const healthCheckLogic = `
app.post('/mcp', (req, res, next) => {
  const method = req.body?.method;
  
  // Allow Glama/Smithery discovery handshakes (initialize, tools/list, ping) without payment blocking
  if (method === 'initialize' || method === 'tools/list' || method === 'ping') {
    return res.json({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "x402 Scraper API", version: "3.5.0" },
        tools: [
          { name: "scrape_basic", description: "Static page extraction ($0.01)" },
          { name: "scrape_dynamic", description: "JS-rendered extraction ($0.05)" },
          { name: "scrape_structured", description: "Structured JSON extraction ($0.15)" },
          { name: "scrape_cached", description: "High-frequency cached scrape ($0.0025)" },
          { name: "scrape_batch", description: "Batch extraction ($0.08)" }
        ]
      },
      id: req.body?.id || 1
    });
  }
  next();
});
`;

if (!serverCode.includes("method === 'initialize'")) {
  serverCode = serverCode.replace("app.use('/mcp'", healthCheckLogic + "\napp.use('/mcp'");
  fs.writeFileSync('server.js', serverCode);
  console.log('[Success] Added initialization handler for Glama and registry health checks.');
} else {
  console.log('[Info] Initialization handler already present.');
}
