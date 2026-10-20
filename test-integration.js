const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.TEST_URL || `http://localhost:${PORT}`;

console.log(`[Test] Running x402 integration tests against: ${BASE_URL}`);

async function runTests() {
  try {
    console.log("\n-> Testing GET / ...");
    const res = await fetch(`${BASE_URL}/`);
    console.log(`Response status: ${res.status}`);
    if (!res.ok && res.status !== 402) {
      throw new Error(`Unexpected status code: ${res.status}`);
    }
    console.log("✅ Integration test passed!");
  } catch (err) {
    console.error("❌ Integration test failed:", err);
    process.exit(1);
  }
}

runTests();
