async function runBenchmark() {
  console.log("🤖 [Benchmark Agent] Initializing M2M ping against x402 endpoint...");
  try {
    const start = Date.now();
    const response = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1
      })
    });

    const duration = Date.now() - start;
    const data = await response.json();

    console.log(`✅ [Benchmark Agent] Status: ${response.status} (${duration}ms)`);
    console.log(`📊 [Benchmark Agent] Tools Discovered: ${data.result?.tools?.length || 0}`);
  } catch (err) {
    console.error("❌ [Benchmark Agent] Ping failed:", err.message);
  }
}

runBenchmark();
