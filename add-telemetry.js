import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const telemetryCode = `
// Lightweight Telemetry State
const telemetry = {
  startTime: new Date().toISOString(),
  totalRequests: 0,
  mcpToolCalls: 0,
  x402ChallengesIssued: 0,
  settledTransactions: 0,
  estimatedRevenueUsdc: 0.00,
  uniqueSessions: new Set(),
  recentLogs: []
};

// Middleware to track incoming traffic
app.use((req, res, next) => {
  telemetry.totalRequests++;
  const sessionId = req.headers["mcp-session-id"] || req.headers["x-session-id"];
  if (sessionId) telemetry.uniqueSessions.add(sessionId);

  // Track /mcp tool requests vs /scrape payment walls
  if (req.path === "/mcp" && req.method === "POST") {
    telemetry.mcpToolCalls++;
  } else if (req.path === "/scrape") {
    telemetry.x402ChallengesIssued++;
  }

  next();
});

// Real-time Telemetry Dashboard Endpoint
app.get("/telemetry", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    metrics: {
      totalRequests: telemetry.totalRequests,
      mcpToolCalls: telemetry.mcpToolCalls,
      x402ChallengesIssued: telemetry.x402ChallengesIssued,
      estimatedDailyVelocity: Math.round((telemetry.mcpToolCalls / (process.uptime() || 1)) * 86400),
      activeUniqueSessions: telemetry.uniqueSessions.size,
      estimatedRevenueUsdc: \`$\${(telemetry.mcpToolCalls * 0.01).toFixed(2)}\`
    },
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.4.0",
      environment: process.env.NODE_ENV || "production"
    }
  });
});
`;

if (!code.includes('app.get("/telemetry"')) {
  // Insert telemetry before routes
  code = code.replace('app.get("/scrape"', telemetryCode + '\napp.get("/scrape"');
  fs.writeFileSync('index.js', code);
  console.log("[Success] Telemetry middleware and /telemetry endpoint integrated.");
} else {
  console.log("[Notice] Telemetry endpoint already present.");
}
