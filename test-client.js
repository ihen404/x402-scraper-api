const ENDPOINT = "https://x402-scraper-api-production-67a4.up.railway.app/api/scrape";

async function runDemo() {
console.log("Testing x402 Scraper API endpoint...");
try {
const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://news.ycombinator.com" })
});

if (res.status === 402) {
  const paymentInfo = await res.json();
  console.log("Received 402 Payment Required response as expected:");
  console.log(paymentInfo);
  console.log("\nTesting authenticated scrape with mock payment proof...");

  const paidRes = await fetch(ENDPOINT, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-402-payment-proof": "0xmock_tx_hash_for_testing"
    },
    body: JSON.stringify({ url: "https://news.ycombinator.com" })
  });

  const paidData = await paidRes.json();
  console.log(`Paid status (${paidRes.status}):`, paidData);
} else {
  const data = await res.json();
  console.log("Response:", data);
}
} catch (err) {
console.error("Request failed:", err.message);
}
}

runDemo();
