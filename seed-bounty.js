async function seedBounty() {
  console.log("[Bounty Seeder] Posting initial micro-bounty to x402 utility engine...");

  // 1. Generate a test API key via deposit
  const depositRes = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/api/credits/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28",
      txHash: `0xBOUNTY_SEED_${Date.now()}`,
      amountUSDC: 2.00
    })
  });
  const depositData = await depositRes.json();
  const apiKey = depositData.apiKey;
  console.log("[Bounty Seeder] Obtained Seeder API Key:", apiKey);

  // 2. Post the micro-bounty
  const bountyRes = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/api/bounties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: JSON.stringify({
      targetUrl: "https://docs.base.org",
      rewardUSDC: 0.25
    })
  });

  const bountyData = await bountyRes.json();
  console.log("[Bounty Seeder] Active Micro-Bounty Posted Successfully:", JSON.stringify(bountyData, null, 2));
}

seedBounty();
