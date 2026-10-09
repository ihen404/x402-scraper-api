import assert from "node:assert";

const TARGET_URL = process.env.TEST_ENDPOINT || "https://x402-scraper-api-production-67a4.up.railway.app";

async function runTests() {
  console.log(`[Test] Running x402 integration tests against: ${TARGET_URL}\n`);

  // Test 1: Check health endpoint
  console.log("-> Testing GET / ...");
  const healthRes = await fetch(`${TARGET_URL}/`);
  assert.strictEqual(healthRes.status, 200, "Health check failed");
  console.log("   Passed ✅");

  // Test 2: Check x402 discovery metadata
  console.log("-> Testing GET /.well-known/x402 ...");
  const discoveryRes = await fetch(`${TARGET_URL}/.well-known/x402`);
  assert.strictEqual(discoveryRes.status, 200, "Discovery endpoint failed");
  const discoveryData = await discoveryRes.json();
  assert.strictEqual(discoveryData.x402_version, "1.0");
  assert.strictEqual(discoveryData.network, "base");
  console.log(`   Passed ✅ (Payment Address: ${discoveryData.payment_address})`);

  // Test 3: Check 402 Payment Required response on unauthenticated scrape
  console.log("-> Testing POST /api/scrape without payment proof ...");
  const scrapeRes = await fetch(`${TARGET_URL}/api/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com" })
  });
  assert.strictEqual(scrapeRes.status, 402, "Expected 402 Payment Required status");
  
  const priceHeader = scrapeRes.headers.get("x-402-price-usd");
  console.log(`   Passed ✅ (Correctly received 402 Payment Required with price: $${priceHeader || "0.001"})`);

  console.log("\n🎉 All integration checks passed successfully!");
}

runTests().catch((err) => {
  console.error("\n❌ Integration test failed:", err);
  process.exit(1);
});
