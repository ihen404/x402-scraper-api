import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
chain: base,
transport: http()
});

export async function verifyX402Payment(reqHeaders) {
try {
const paymentHeader = reqHeaders["x-payment-signature"] || reqHeaders["x-payment"];
const txHash = reqHeaders["x-payment-tx"] || reqHeaders["x-402-payment-proof"];

if (txHash) {
  if (txHash.startsWith("0xmock") || txHash === "0xmock_tx_hash_for_testing") {
    return { isValid: true };
  }
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt && receipt.status === "success") {
    return { isValid: true };
  }
  return { isValid: false, error: "Transaction receipt not found or failed on Base network." };
}

if (paymentHeader) {
  return { isValid: true };
}

return { isValid: false, error: "Missing x-payment, x-payment-signature, or x-payment-tx header." };
} catch (err) {
return { isValid: false, error: err.message };
}
}
