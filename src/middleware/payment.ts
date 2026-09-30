import { createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export async function verifyX402Payment(reqHeaders: Headers): Promise<{ isValid: boolean; error?: string }> {
  const txHash = reqHeaders.get('x-payment-tx') as `0x${string}`;
  if (!txHash) {
    return { isValid: false, error: 'Missing X-Payment-Tx header. Micro-payment required.' };
  }
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== 'success') {
      return { isValid: false, error: 'Transaction failed or not found on Base mainnet.' };
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: `Payment verification error: ${err.message}` };
  }
}
