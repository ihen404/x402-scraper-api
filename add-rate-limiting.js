import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

const rateLimitCode = `
import rateLimit from "express-rate-limit";

// Shield unpaid challenge spammers: Max 30 requests per minute per IP on /scrape
const scrapeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many scraping requests/challenges from this IP. Please throttle agent loops or settle pending x402 payments."
  }
});

// Apply rate limiter specifically to scraping endpoints
app.use("/scrape", scrapeLimiter);
`;

if (!code.includes("express-rate-limit")) {
  // Insert rate limiter import and middleware near top of app setup
  code = code.replace('const app = express();', 'const app = express();\n' + rateLimitCode);
  fs.writeFileSync('index.js', code);
  console.log("[Success] Rate limiting middleware successfully integrated.");
} else {
  console.log("[Notice] Rate limiting already configured.");
}
