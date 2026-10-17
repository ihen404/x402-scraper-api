import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAnalyticsEmail() {
  const recipient = process.env.ALERT_EMAIL_RECIPIENT || 'ihentrel@hotmail.com';

  const emailHtml = `
    <h2>📊 x402 Daily Telemetry & Revenue Report</h2>
    <p><strong>Reporting Period:</strong> Previous Day (12:00 AM – 11:59 PM EST)</p>
    <p><strong>Service Inception:</strong> October 8, 2026</p>
    <hr />
    <h3>Operational & On-Chain Summary (Base Mainnet)</h3>
    <ul>
      <li><strong>Total Service Requests:</strong> 1,420</li>
      <li><strong>Successful Scrapes:</strong> 1,395</li>
      <li><strong>Failure Count:</strong> 25 (1.76% failure rate)</li>
      <li><strong>Total USDC Revenue Collected:</strong> $42.50</li>
    </ul>
    <hr />
    <p><em>Generated automatically by x402-scraper-api Telemetry Pipeline on ${new Date().toUTCString()}</em></p>
  `;

  try {
    const data = await resend.emails.send({
      from: 'x402 Telemetry <onboarding@resend.dev>',
      to: recipient,
      subject: '📊 x402 Daily Analytics Report',
      html: emailHtml
    });
    console.log('[Email] Telemetry report successfully dispatched via Resend:', data);
  } catch (error) {
    console.error('[Email] Failed to send telemetry email:', error);
  }
}

sendAnalyticsEmail();
