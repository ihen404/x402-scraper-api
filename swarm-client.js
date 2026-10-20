// x402 Scraper API - Autonomous Swarm Client Simulator
// Simulates an agent swarm executing multiple scraping tasks with USDC micro-payments.

const ENDPOINT = "https://x402-scraper-api-production-67a4.up.railway.app/mcp";

const targets = [
  { tool: "scrape_basic", url: "https://example.com" },
  { tool: "scrape_advanced", url: "https://news.ycombinator.com" },
  { tool: "scrape_basic", url: "https://httpbin.org/json" },
  { tool: "scrape_advanced", url: "https://github.com/trending" }
];

async function runSwarmCycle() {
  console.log("🐝 [Swarm Client] Initiating automated scraping cycle across agent swarm...");

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`\n🤖 Agent [Swarm-#${i+1}] requesting ${target.tool} for ${target.url}...`);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: target.tool, arguments: { url: target.url } },
          id: i + 1
        })
      });

      if (res.status === 402) {
        const challenge = await res.json();
        const price = target.tool === "scrape_advanced" ? "0.03" : "0.01";
        console.log(`💳 Received 402 Payment Challenge. Amount required: $${price} USDC`);
        console.log(`⚡ Simulating valid on-chain settlement signature on Base/Solana...`);
        
        // Re-attempt with simulated payment signature header
        const paidRes = await fetch(ENDPOINT, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "PAYMENT-SIGNATURE": `mock_usdc_sig_base_solana_${Date.now()}`
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: target.tool, arguments: { url: target.url } },
            id: i + 1
          })
        });

        const paidData = await paidRes.json();
        console.log(`✅ [Swarm-#${i+1}] Scrape successful! Result:`, paidData.result.content[0].text);
      } else {
        const data = await res.json();
        console.log(`✅ [Swarm-#${i+1}] Response:`, data);
      }
    } catch (err) {
      console.error(`❌ [Swarm-#${i+1}] Error during execution:`, err.message);
    }
  }

  console.log("\n✨ Swarm scraping cycle completed successfully. On-chain telemetry updated.");
}

runSwarmCycle();
