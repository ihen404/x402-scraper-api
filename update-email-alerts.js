import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const emailAlertCode = `
// Real-time Email Alerting System
let lastAlertedRevenue = 0;

async function checkRevenueAlerts(revenue) {
  const numericRev = parseFloat(revenue);
  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL || "ikehentrel@gmail.com";

  if (!apiKey) return;

  // Trigger alert every $5.00 in settled revenue milestone
  if (numericRev >= lastAlertedRevenue + 5.00) {
    lastAlertedRevenue = numericRev;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${apiKey}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "x402 Scraper API <alerts@resend.dev>",
          to: alertEmail,
          subject: \`🚀 Revenue Alert: $\${numericRev.toFixed(2)} USDC Milestone Reached!\`,
          html: \`
            <h2>x402 Scraper API Revenue Milestone</h2>
            <p>Your server has hit a new revenue threshold on Base Mainnet!</p>
            <ul>
              <li><b>Total Revenue:</b> $\${numericRev.toFixed(2)} USDC</li>
              <li><b>Total Tool Invocations:</b> \${telemetry.mcpToolCalls}</li>
              <li><b>Estimated Velocity:</b> \${Math.round((telemetry.mcpToolCalls / (process.uptime() || 1)) * 86400)} req/day</li>
            </ul>
            <p><a href="https://x402-scraper-api-production-67a4.up.railway.app/telemetry">View Live Telemetry Dashboard</a></p>
          \`
        })
      });
      console.log("[Email Alert] Milestone notification sent to " + alertEmail);
    } catch (e) {
      console.error("[Email Alert Error]", e);
    }
  }
}
`;

// Replace older webhook helper if present or append new email logic
if (code.includes("checkRevenueAlerts")) {
  code = code.replace(/function checkRevenueAlerts[\s\S]*?\n\}\n/g, emailAlertCode + "\n");
} else {
  code += "\n" + emailAlertCode;
}

fs.writeFileSync('index.js', code);
console.log("[Success] Direct email alert module injected.");
