import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const updatedTelemetryCode = `
app.get("/telemetry", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  return res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    metrics: {
      totalRequests: telemetry.totalRequests,
      mcpToolCalls: {
        basic: telemetry.mcpToolCallsBasic || 0,
        dynamic: telemetry.mcpToolCallsDynamic || 0,
        structured: telemetry.mcpToolCallsStructured || 0,
        total: telemetry.mcpToolCalls
      },
      x402ChallengesIssued: telemetry.x402ChallengesIssued,
      estimatedDailyVelocity: Math.round((telemetry.mcpToolCalls / (process.uptime() || 1)) * 86400),
      activeUniqueSessions: telemetry.uniqueSessions.size,
      estimatedRevenueUsdc: "$" + (
        ((telemetry.mcpToolCallsBasic || 0) * 0.01) +
        ((telemetry.mcpToolCallsDynamic || 0) * 0.05) +
        ((telemetry.mcpToolCallsStructured || 0) * 0.15) +
        ((telemetry.mcpToolCalls - ((telemetry.mcpToolCallsBasic || 0) + (telemetry.mcpToolCallsDynamic || 0) + (telemetry.mcpToolCallsStructured || 0))) * 0.01)
      ).toFixed(2)
    },
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.5.0",
      environment: process.env.NODE_ENV || "production"
    }
  });
});
`;

// Replace existing app.get("/telemetry") block
code = code.replace(/app\.get\("\/telemetry"[\s\S]*?\n\}\);\n/g, updatedTelemetryCode + "\n");

fs.writeFileSync('index.js', code);
console.log("[Success] Telemetry endpoint updated to v3.5.0 with tier breakdown.");
