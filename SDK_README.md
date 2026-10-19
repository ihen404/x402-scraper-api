# @ihentrel/x402-express

Lightweight Express middleware for HTTP 402 micro-payment settlement on Base Mainnet and Solana Mainnet.

## Installation
```bash
npm install @ihentrel/x402-express
```

## Quickstart Usage
```javascript
import express from "express";
import { x402PaymentGate } from "@ihentrel/x402-express";

const app = express();

// Protect any route with $0.01 USDC x402 payment gating
app.use("/scrape", x402PaymentGate({
recipientBase: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
recipientSolana: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz",
price: "0.01"
}));

app.post("/scrape", (req, res) => {
res.json({ status: "success", data: "Paid content delivered." });
});

app.listen(3000);
```
