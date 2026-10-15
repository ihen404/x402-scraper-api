const ENDPOINT = "https://x402-scraper-api-production-67a4.up.railway.app/mcp";

async function runTests() {
  console.log("[Test 1] Querying MCP Tools List...");
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1
      })
    });
    const data = await res.json();
    console.log("[Test 1 Result] Status:", res.status, "Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[Test 1 Error]", err.message);
  }

  console.log("\n[Test 2] Testing Scraping Endpoint Payment Wall (HTTP 402)...");
  try {
    const res = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/scrape?url=https://docs.base.org");
    console.log("[Test 2 Result] HTTP Status:", res.status, "(Expected: 402 Payment Required)");
    const text = await res.text();
    console.log("[Test 2 Body snippet]:", text.substring(0, 150));
  } catch (err) {
    console.error("[Test 2 Error]", err.message);
  }
}

runTests();
