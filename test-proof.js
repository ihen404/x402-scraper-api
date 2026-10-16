async function testCryptographicProof() {
  const BASE_URL = "https://x402-scraper-api.onrender.com";
  
  console.log("🔒 [Security Test] Requesting Cryptographic Proof-of-Scrape (`scrape_proof`)...");
  
  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Payment-Signature": "x402_sig_cryptographic_test_001",
        "X-Settlement-Chain": "eip155:8453"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "scrape_proof",
          arguments: { url: "https://news.ycombinator.com" }
        },
        id: 777
      })
    });

    const result = await response.json();
    console.log(`✅ [Test Status] HTTP Code: ${response.status}`);
    console.log("📦 [Signed Payload Response]:\n", JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("❌ Cryptographic proof test failed:", err.message);
  }
}

testCryptographicProof();
