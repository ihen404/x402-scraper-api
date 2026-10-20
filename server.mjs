
// Solana & Base Multi-Chain Config
const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_PAYMENT_ADDRESS = process.env.SOLANA_PAYMENT_ADDRESS || "YourSolanaWalletAddressHere";
const BASE_PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Helper: Calculate tier pricing based on URL complexity
function getTierPricing(targetUrl) {
  if (!targetUrl) return { price: "$0.01", tier: "basic" };
  const lower = targetUrl.toLowerCase();
  if (lower.includes("json") || lower.includes("api") || lower.includes("extract")) {
    return { price: "$0.15", tier: "structured" };
  }
  if (lower.includes("cloudflare") || lower.includes("app.") || lower.includes("dashboard")) {
    return { price: "$0.05", tier: "dynamic" };
  }
  return { price: "$0.01", tier: "basic" };
}

// Generates multi-chain HTTP 402 challenge accepts array
function buildX402Accepts(targetUrl) {
  const { price, tier } = getTierPricing(targetUrl);
  return {
    tier,
    accepts: [
      {
        scheme: "exact",
        network: "solana-mainnet",
        asset: SOLANA_USDC_MINT,
        payTo: SOLANA_PAYMENT_ADDRESS,
        price: price
      },
      {
        scheme: "exact",
        network: "base-mainnet",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        payTo: BASE_PAYMENT_ADDRESS,
        price: price
      }
    ]
  };
}

import "./server.js";
