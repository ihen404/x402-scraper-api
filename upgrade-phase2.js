import fs from 'fs';

let code = fs.readFileSync('server.js', 'utf8');

// Add Phase 2 tools handling to the /mcp endpoint handler if not already present
const phase2Logic = `
// Phase 2: Mock execution handler for cached and batch tools
app.post('/mcp', (req, res, next) => {
  const toolName = req.body?.params?.name;
  const args = req.body?.params?.arguments || {};

  if (toolName === 'scrape_cached') {
    return res.json({
      jsonrpc: "2.0",
      result: {
        content: [{ type: "text", text: "[Cached Markdown Extraction for: " + (args.url || 'unknown') + "]" }],
        cachedAt: new Date(Date.now() - 300000).toISOString()
      },
      id: req.body?.id || 1
    });
  }

  if (toolName === 'scrape_batch') {
    const urls = args.urls || [];
    return res.json({
      jsonrpc: "2.0",
      result: {
        batchSize: urls.length,
        results: urls.map(u => ({ url: u, status: "success", markdown: "[Batch extracted content]" }))
      },
      id: req.body?.id || 1
    });
  }
  next();
});
`;

if (!code.includes('scrape_cached')) {
  // Insert before the telemetry/discovery routes
  code = code.replace("app.get('/telemetry'", phase2Logic + "\napp.get('/telemetry'");
  fs.writeFileSync('server.js', code);
  console.log('[Success] Phase 2 cached and batch tool handlers added to server.js');
} else {
  console.log('[Info] Phase 2 tools already present.');
}
