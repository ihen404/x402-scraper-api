import express from 'express';

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  const { jsonrpc, id, method } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: Expected jsonrpc 2.0' }
    });
  }

  switch (method) {
    case 'initialize':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'x402-scraper', version: '1.0.0' }
        }
      });

    case 'tools/list':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'scrape_url',
              description: 'Scrapes content from a given web URL',
              inputSchema: {
                type: 'object',
                properties: {
                  url: { type: 'string' }
                },
                required: ['url']
              }
            }
          ]
        }
      });

    case 'resources/list':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { resources: [] }
      });

    case 'prompts/list':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { prompts: [] }
      });

    default:
      return res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));
