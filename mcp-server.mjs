import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API_BASE = 'https://x402-scraper-api-production-67a4.up.railway.app';

const server = new Server(
  { name: 'x402-scraper-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'scrape_url',
      description: 'Scrape a single target URL using the x402 payment-gated scraper API.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The target URL to scrape' },
          paymentToken: { type: 'string', description: 'Valid x-payment token' }
        },
        required: ['url', 'paymentToken']
      }
    },
    {
      name: 'batch_scrape',
      description: 'Scrape multiple target URLs in high-throughput batch mode.',
      inputSchema: {
        type: 'object',
        properties: {
          urls: { type: 'array', items: { type: 'string' }, description: 'Array of target URLs' },
          paymentToken: { type: 'string', description: 'Valid x-payment token' }
        },
        required: ['urls', 'paymentToken']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'scrape_url') {
    const res = await fetch(`${API_BASE}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment': args.paymentToken
      },
      body: JSON.stringify({ url: args.url })
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  if (name === 'batch_scrape') {
    const res = await fetch(`${API_BASE}/api/scrape/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment': args.paymentToken
      },
      body: JSON.stringify({ urls: args.urls })
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('x402 Scraper MCP Server running on stdio');
