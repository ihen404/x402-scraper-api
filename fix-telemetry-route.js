import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Clean out old telemetry definitions if broken
code = code.replace(/\/\/ Lightweight Telemetry State[\s\S]*?app\.get\("\/telemetry"[\s\S]*?\n\}\);\n/g, "");

const cleanTelemetryCode = `
// Lightweight Telemetry State & Dashboard
const telemetry = {
  startTime: new Date().toISOString(),
  totalRequests: 0,
  mcpToolCalls: 0,
  x402ChallengesIssued: 0,
  uniqueSessions: new Set()
};

app.use((req, res, next) => {
  telemetry.totalRequests++;
  const sessionId = req.headers["mcp-session-id"] || req.headers["x-session-id"];
  if (sessionId) telemetry.uniqueSessions.add(sessionId);
  if (req.path === "/mcp" && req.method === "POST") telemetry.mcpToolCalls++;
  if (req.path === "/scrape") telemetry.x402ChallengesIssued++;
  next();
});

app.get("/telemetry", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  return res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    metrics: {
      totalRequests: telemetry.totalRequests,
      mcpToolCalls: telemetry.mcpToolCalls,
      x402ChallengesIssued: telemetry.x402ChallengesIssued,
      estimatedDailyVelocity: Math.round((telemetry.mcpToolCalls / (process.uptime() || 1)) * 86400),
      activeUniqueSessions: telemetry.uniqueSessions.size,
      estimatedRevenueUsdc: "$" + (telemetry.mcpToolCalls * 0.01).toFixed(2)
    },
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.4.0",
      environment: process.env.NODE_ENV || "production"
    }
  });
});
`;

// Insert directly after app initialization
if (code.includes('const app = express();') || code.includes('const app = express()')) {
  code = code.replace(/const app = express\(\);?/, 'const app = express();\n' + cleanTelemetryCode);
  fs.writeFileSync('index.js', code);
  console.log("[Success] Telemetry route injected directly below express initialization.");
} else {
  console.log("[Notice] Couldn't find express init line, appending to file.");
  fs.writeFileSync('index.js', code + "\n" + cleanTelemetryCode);
}
