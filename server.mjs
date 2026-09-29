import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper scrape function
async function scrapeUrl(url) {
  return {
    url,
    title: "Example Title",
    content: "Scraped content placeholder from production endpoint"
  };
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Base route
app.get('/', (req, res) => {
  res.send('x402 Scraper MCP Server is running');
});

// MCP JSON-RPC 2.0 Route Handler (matches /mcp and /mcp/)
app.all(['/mcp', '/mcp/'], async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { jsonrpc, id, method, params } = req.body || {};

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'x402-scraper', version: '1.0.0' }
      }
    });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'scrape',
            description: 'Scrape content from a given URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Target URL to scrape' }
              },
              required: ['url']
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    if (name === 'scrape') {
      const scrapedData = await scrapeUrl(args?.url);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            { type: 'text', text: JSON.stringify(scrapedData) }
          ]
        }
      });
    }
  }

  res.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
