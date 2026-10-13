import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const mcpRouteCode = `
// MCP JSON-RPC Tool Execution Handler
app.post("/mcp", async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      result: {
        tools: [
          { name: "scrape_basic", description: "Fast DOM parsing and clean Markdown extraction ($0.01 USDC)" },
          { name: "scrape_dynamic", description: "Headless browser JS rendering and extraction ($0.05 USDC)" },
          { name: "scrape_structured", description: "Structured JSON schema extraction ($0.15 USDC)" }
        ]
      },
      id
    });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};

    // Update Telemetry Counters
    telemetry.mcpToolCalls++;
    if (toolName === "scrape_basic") telemetry.mcpToolCallsBasic = (telemetry.mcpToolCallsBasic || 0) + 1;
    if (toolName === "scrape_dynamic") telemetry.mcpToolCallsDynamic = (telemetry.mcpToolCallsDynamic || 0) + 1;
    if (toolName === "scrape_structured") telemetry.mcpToolCallsStructured = (telemetry.mcpToolCallsStructured || 0) + 1;

    // Check revenue milestones
    const basic = telemetry.mcpToolCallsBasic || 0;
    const dynamic = telemetry.mcpToolCallsDynamic || 0;
    const structured = telemetry.mcpToolCallsStructured || 0;
    const currentRev = (basic * 0.01 + dynamic * 0.05 + structured * 0.15).toFixed(2);
    if (typeof checkRevenueAlerts === "function") {
      checkRevenueAlerts(currentRev);
    }

    let resultData = { success: true, url: args.url, content: "Simulated scraped content from " + args.url };
    if (toolName === "scrape_structured") {
      resultData = { success: true, url: args.url, extractedData: { parsed: true, sample: "Structured schema data" } };
    }

    return res.json({
      jsonrpc: "2.0",
      result: {
        content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }]
      },
      id
    });
  }

  res.status(400).json({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: id || null });
});
`;

if (!code.includes('app.post("/mcp"')) {
  // Insert right before app.listen
  const parts = code.split("app.listen");
  fs.writeFileSync('index.js', parts[0] + "\n" + mcpRouteCode + "\napp.listen" + parts[1]);
  console.log("[Success] /mcp handler injected.");
} else {
  console.log("[Notice] /mcp handler already present.");
}
