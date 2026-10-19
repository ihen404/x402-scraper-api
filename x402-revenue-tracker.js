import fetch from "node-fetch";

const CONFIG = {
  pricePerScrape: 0.01, // $0.01 USDC
  mrrGoal: 10000,       // $10,000 MRR target
  solanaAddress: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz",
  baseAddress: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  gatewayUrl: "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
};

async function checkRevenueStatus() {
  console.log("==================================================");
  console.log("📊 x402 Scraper API — Real-Time Revenue Monitor");
  console.log("==================================================");
  console.log("Gateway Endpoint :", CONFIG.gatewayUrl);
  console.log("Solana Routing   :", CONFIG.solanaAddress);
  console.log("Base EVM Routing :", CONFIG.baseAddress);
  console.log("Unit Pricing     : $" + CONFIG.pricePerScrape.toFixed(2) + " USDC / req");
  console.log("--------------------------------------------------");

  try {
    // Ping Gateway Health
    const res = await fetch(CONFIG.gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "scrape_basic", params: { url: "https://example.com" }, id: 1 })
    });

    const status402 = res.status === 402;
    console.log("Gateway 402 Challenge Status :", status402 ? "✅ ACTIVE (Enforcing Payment)" : "⚠️ " + res.status);

    // Calculate targets required for $10k MRR
    const requiredScrapes = CONFIG.mrrGoal / CONFIG.pricePerScrape;
    const dailyTargetScrapes = Math.round(requiredScrapes / 30);

    console.log("--------------------------------------------------");
    console.log("🎯 $10k MRR Scalability Milestones:");
    console.log("   • Required Scrapes/Month : " + requiredScrapes.toLocaleString() + " reqs");
    console.log("   • Required Scrapes/Day   : ~" + dailyTargetScrapes.toLocaleString() + " reqs/day");
    console.log("   • Required Active Agents : ~" + Math.round(dailyTargetScrapes / 100) + " agents (@ 100 reqs/day)");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Error fetching gateway health:", err.message);
  }
}

checkRevenueStatus();
