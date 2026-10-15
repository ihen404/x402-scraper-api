import fs from 'fs';
import crypto from 'crypto';

console.log("🔒 Patching server.js with Cryptographic Proof-of-Scrape handler...");

let serverCode = fs.readFileSync('server.js', 'utf8');

// Ensure crypto is imported in server.js
if (!serverCode.includes("import crypto")) {
  serverCode = "import crypto from 'crypto';\n" + serverCode;
}

// Add proof generation logic into the tool call handler if not already present
if (!serverCode.includes("generateProofSignature")) {
  const proofHandlerCode = `
// Cryptographic Proof-of-Scrape Helper
function generateProofSignature(data) {
  const secret = process.env.X402_PROOF_SECRET || 'x402_secure_master_signing_key_2026';
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ data, timestamp });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { payload: data, timestamp, signature: \`sha256=\${signature}\` };
}
`;
  serverCode = proofHandlerCode + "\n" + serverCode;
}

fs.writeFileSync('server.js', serverCode);
console.log("✅ server.js successfully patched with cryptographic signing engine.");
