const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/scrape', (req, res) => {
  res.status(402).json({
    error: "Payment Required",
    message: "This endpoint requires an on-chain payment of 0.005 USDC on Base.",
    accepts: {
      scheme: "exact",
      payTo: process.env.PAYMENT_WALLET_ADDRESS || "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28",
      price: "0.005",
      asset: "USDC",
      network: "base"
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
