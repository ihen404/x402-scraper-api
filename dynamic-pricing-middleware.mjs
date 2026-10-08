export function calculateDynamicPricing(reqBody = {}) {
  const isHeadless = reqBody.renderJs === true || reqBody.complexity === "high"; 
  const baseCost = isHeadless ? "0.25" : "0.10";
  const tierName = isHeadless ? "headless-spa-render" : "standard-html-fetch";

  return {
    x402Version: 2,
    tier: tierName,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453", 
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 
        amount: String(Number(baseCost) * 1_000_000), 
        payTo: process.env.PAYEE_WALLET || "0x1234567890abcdef1234567890abcdef12345678",
        maxTimeoutSeconds: 60
      },
      {
        scheme: "exact",
        network: "eip155:42161", 
        asset: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", 
        amount: String(Number(baseCost) * 1_000_000),
        payTo: process.env.PAYEE_WALLET || "0x1234567890abcdef1234567890abcdef12345678",
        maxTimeoutSeconds: 60
      },
      {
        scheme: "intent-bridge",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", 
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
        amount: String(Number(baseCost) * 1_000_000),
        payTo: process.env.SOLANA_PAYEE_WALLET || "SolanaRecipientWalletAddressPlaceholder",
        maxTimeoutSeconds: 60
      }
    ],
    resolverInstruction: `Sign micro-transaction of ${baseCost} USDC via x402 V2 authorization headers.`
  };
}
