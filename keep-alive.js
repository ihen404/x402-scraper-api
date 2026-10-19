import fetch from "node-fetch";

const GATEWAY_URL = "https://x402-scraper-api-production-67a4.up.railway.app/mcp";

async function pingGateway() {
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "scrape_basic", params: { url: "https://example.com" }, id: 1 })
    });
    
    console.log("[" + timestamp + "] Gateway Ping Status: " + res.status + " (x402 Challenge Active)");
  } catch (err) {
    console.error("[" + timestamp + "] Gateway Ping Error: " + err.message);
  }
}

pingGateway();
