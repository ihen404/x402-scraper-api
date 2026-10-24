import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { parseB2BIntent } from "./services/intentParser.js";
const X402_SCRAPER_ENDPOINT = process.env.X402_SCRAPER_ENDPOINT || "https://your-x402-scraper.com/api/scrape";
export function createB2BIntentServer() {
    const server = new McpServer({
        name: "b2b-intent-enrichment",
        version: "1.0.0",
    });
    server.registerTool("enrich_b2b_prospect", {
        description: "Extract actionable B2B hiring signals, value props, tech stack, and outbound sales angles from any company domain.",
        inputSchema: z.object({
            domain: z.string().describe("Target company domain (e.g., 'stripe.com' or 'acme.io')"),
        }),
    }, async ({ domain }) => {
        try {
            const targetUrl = domain.startsWith("http") ? domain : `https://${domain}`;
            const scraperRes = await fetch(X402_SCRAPER_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-PAYMENT-MODE": "internal"
                },
                body: JSON.stringify({ url: targetUrl }),
            });
            if (!scraperRes.ok) {
                throw new Error(`Scraper API returned status ${scraperRes.status}`);
            }
            const { markdown } = await scraperRes.json();
            const enrichedData = await parseB2BIntent(domain, markdown);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(enrichedData, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: `Enrichment failed: ${error.message}` }],
            };
        }
    });
    return server;
}
