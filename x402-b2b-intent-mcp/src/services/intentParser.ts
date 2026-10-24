import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export interface B2BIntentPayload {
  companyName: string;
  valueProposition: string;
  targetAudience: string;
  hiringSignals: string[];
  techStack: string[];
  recentProductAnnouncements: string[];
  outboundAngles: {
    hook: string;
    painPointAddressed: string;
    suggestedCTA: string;
  }[];
}

const SYSTEM_PROMPT = `You are an elite B2B Sales Intelligence Analyst. 
Your task is to analyze scraped website Markdown and extract actionable intelligence into pristine JSON.
Do not include commentary, markdown formatting, or triple backticks. Return raw JSON matching the required schema.`;

export async function parseB2BIntent(domain: string, rawMarkdown: string): Promise<B2BIntentPayload> {
  const userPrompt = `Domain: ${domain}
Raw Scraped Content:
---
${rawMarkdown.slice(0, 15000)}
---

Extract B2B Sales Intelligence and return ONLY JSON with this structure:
{
  "companyName": "string",
  "valueProposition": "1-2 sentence core value prop",
  "targetAudience": "Ideal customer profile inferred from page",
  "hiringSignals": ["List active roles, hiring pushes, or growth indicators"],
  "techStack": ["Tools/software explicitly mentioned or detected"],
  "recentProductAnnouncements": ["New features, press releases, or updates"],
  "outboundAngles": [
    {
      "hook": "Hyper-personalized email opening line",
      "painPointAddressed": "The specific friction or goal addressed",
      "suggestedCTA": "Relevant low-friction offer"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textOutput = response.content[0].type === "text" ? response.content[0].text : "";
  
  try {
    return JSON.parse(textOutput) as B2BIntentPayload;
  } catch (err) {
    throw new Error(`Failed to parse LLM intent response into JSON: ${textOutput}`);
  }
}
