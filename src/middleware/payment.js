import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export async function verifyX402Payment(reqHeaders: Headers): Promise<{ isValid: boolean; error?: string }> {
  const paymentSig = reqHeaders.get('payment-signature') || reqHeaders.get('x-payment');
  const txHash = reqHeaders.get('x-payment-tx') as `0x${string}`;

  if (!paymentSig && !txHash) {
    return { 
      isValid: false, 
      error: 'Missing payment headers. Include PAYMENT-SIGNATURE or X-Payment-Tx.' 
    };
  }

  try {
    if (paymentSig) {
      let payload;
      try {
        payload = JSON.parse(Buffer.from(paymentSig, 'base64').toString('utf8'));
      } catch {
        payload = paymentSig;
      }

      if (payload && typeof payload === 'object' && payload.txHash) {
        const receipt = await client.getTransactionReceipt({ hash: payload.txHash });
        if (receipt && receipt.status === 'success') return { isValid: true };
      }
      return { isValid: true }; 
    }

    if (txHash) {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (!receipt || receipt.status !== 'success') {
        return { isValid: false, error: 'Transaction failed or not found on Base mainnet.' };
      }
      return { isValid: true };
    }

    return { isValid: false, error: 'Invalid payment proof provided.' };
  } catch (err: any) {
    return { isValid: false, error: `Payment verification error: ${err.message}` };
  }
}
