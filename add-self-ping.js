import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const selfPingCode = `
// Internal Uptime Keep-Alive Ping (Runs every 4 mins to keep Railway container warm)
setInterval(async () => {
  try {
    const url = process.env.RAILWAY_STATIC_URL 
      ? \`https://\${process.env.RAILWAY_STATIC_URL}/telemetry\`
      : "https://x402-scraper-api-production-67a4.up.railway.app/telemetry";
    await fetch(url);
  } catch (err) {
    // Silent catch for background heartbeat
  }
}, 4 * 60 * 1000);
`;

if (!code.includes("Internal Uptime Keep-Alive Ping")) {
  fs.writeFileSync('index.js', code + "\n" + selfPingCode);
  console.log("[Success] Internal keep-alive heartbeat appended.");
}
