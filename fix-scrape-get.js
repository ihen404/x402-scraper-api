import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const scrapeGetHandler = `
// Public GET handler for /scrape to return x402 payment instructions
app.get("/scrape", (req, res) => {
  res.status(402).json({
    error: "Payment Required",
    message: "x402 protocol micro-payment required ($0.01 USDC on Base Mainnet). Please invoke via MCP tool or send a POST request with valid x402 payment authorization headers.",
    targetUrl: req.query.url || null,
    network: "Base Mainnet",
    price: "$0.01 USDC"
  });
});
`;

if (!code.includes('app.get("/scrape"')) {
  code = code + "\n" + scrapeGetHandler;
  fs.writeFileSync('index.js', code);
}
