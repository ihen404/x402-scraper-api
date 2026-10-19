import fetch from "node-fetch";

const CONFIG = {
solanaRecipient: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz",
baseRecipient: "0xD4fd01ce7B0131eD77342d0375507110742EB925"
};

async function checkBalances() {
console.log("🔍 [x402-Pulse] Querying live on-chain settlement balances...");

try {
// Check Base EVM balance via public RPC
const baseRes = await fetch("https://mainnet.base.org", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [CONFIG.baseRecipient, "latest"],
    id: 1
  })
});
const baseData = await baseRes.json();
const baseEthWei = baseData.result ? parseInt(baseData.result, 16) : 0;
console.log(`✅ [Base] Recipient Balance (Wei): ${baseEthWei}`);
} catch (e) {
console.log("⚠️ [Base] RPC check skipped or rate limited.");
}

console.log("🚀 [x402-Pulse] Telemetry audit complete. Ready for agentic scale.");
}

checkBalances();
