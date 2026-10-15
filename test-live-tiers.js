const BASE_URL = "https://x402-scraper-api-production-67a4.up.railway.app";

async function runTests() {
  console.log("[Test] Simulating MCP tool calls across all three tiers...");

  // 1. Simulate Basic Scrape ($0.01)
  try {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: { name: "scrape_basic", arguments: { url: "https://example.com" } }, id: 1 })
    });
    console.log(`[Basic Scrape] Status: ${res.status}`);
  } catch (e) { console.log("[Basic Test Note]", e.message); }

  // 2. Simulate Dynamic Scrape ($0.05)
  try {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: { name: "scrape_dynamic", arguments: { url: "https://example.com", waitForMs: 1000 } }, id: 2 })
    });
    console.log(`[Dynamic Scrape] Status: ${res.status}`);
  } catch (e) { console.log("[Dynamic Test Note]", e.message); }

  // 3. Simulate Structured Scrape ($0.15)
  try {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: { name: "scrape_structured", arguments: { url: "https://example.com", jsonSchema: { title: "string" } } }, id: 3 })
    });
    console.log(`[Structured Scrape] Status: ${res.status}`);
  } catch (e) { console.log("[Structured Test Note]", e.message); }

  // Fetch updated telemetry
  const telemetryRes = await fetch(`${BASE_URL}/telemetry`);
  const telemetryData = await telemetryRes.json();
  console.log("\n[Telemetry Verification Result]:", JSON.stringify(telemetryData, null, 2));
}

runTests();
