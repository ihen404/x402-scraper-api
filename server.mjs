import express from 'express';

const app = express();
app.use(express.json());

const serverCardPayload = {
  "$schema": "https://smithery.ai/mcp-server-card.schema.json",
  "name": "x402-scraper",
  "description": "Autonomous pay-per-request web scraper operating on Base using x402 microtransactions.",
  "version": "1.0.23",
  "transport": {
    "type": "stdio",
    "command": "node",
    "args": ["dist/index.js"]
  }
};

// Base health check
app.get('/', (req, res) => {
  res.send('x402 Scraper API is active');
});

// Smithery Discovery Metadata Routes
app.get(['/.well-known/mcp/server-card.json', '/.well-known/mcp.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(serverCardPayload);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
