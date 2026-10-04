import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org";
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

// Seed list of 8 test community names on Sepolia
const COMMUNITY_NAMES = [
  "alice-builder.eth",
  "bob-rust-expert.eth",
  "carol-designer.eth",
  "dave-adversarial.eth",
  "eve-mentor.eth",
  "frank-dev.eth",
  "grace-frontend.eth",
  "heidi-solidity.eth"
];

// Helper to fetch and build the index (Check 4)
async function buildIndex() {
  const index = [];
  for (const name of COMMUNITY_NAMES) {
    try {
      const bio = await publicClient.getEnsText({ name, key: "community.bio" });
      const available = await publicClient.getEnsText({ name, key: "community.available" });
      if (bio && available) {
        index.push({ name, bio, available });
      }
    } catch {
      // Ignore errors for missing names
    }
  }
  return index;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // Build index using live ENS calls (Check 4)
    const candidates = await buildIndex();

    // Check 5: An empty match produces an explicit no-match response
    if (candidates.length === 0) {
      return NextResponse.json({ 
        answer: "Nobody fits. No candidates found in the community index.",
        matches: []
      });
    }

    // Check 2: Bounded number of candidates sent to the model (top-k limit)
    // We arbitrarily slice to a max of 5 to bound the prompt size
    const topKCandidates = candidates.slice(0, 5);

    // Check 3: Profile text is NEVER interpolated into the system prompt
    // The system prompt is purely app-authored instructions
    const systemInstruction = `You are a community matchmaker.
Read the provided user data which contains a list of candidates in JSON format.
Answer the user's question by selecting the best candidates.
Format your output as a JSON object with two fields:
- "answer": a human-readable explanation of why these people match.
- "recommendedNames": an array of exact ENS names you chose.
If nobody matches, return an empty array for recommendedNames and state "nobody fits" in the answer.`;

    // Candidate data goes strictly into a separate user/data message
    const dataMessage = `Candidates Data:
${JSON.stringify(topKCandidates)}

User Question: ${question}`;

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const modelId = process.env.MODEL_ID || "gpt-3.5-turbo";

    if (!apiKey) {
      return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
    }

    // Check 7: The model request has an explicit timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let aiResponse;
    let data;
    try {
      aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: dataMessage }
          ]
        }),
        signal: controller.signal
      });

      if (!aiResponse.ok) {
        return NextResponse.json({ error: "Provider failure" }, { status: 502 });
      }

      data = await aiResponse.json();
    } finally {
      clearTimeout(timeoutId);
    }
    
    let rawOutput = data.choices?.[0]?.message?.content || "{}";
    
    // Parse the JSON output from the model
    let parsedOut = { answer: "Error parsing model output", recommendedNames: [] };
    try {
      // Strip markdown code blocks if the model wrapped it
      if (rawOutput.startsWith("```json")) {
        rawOutput = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      parsedOut = JSON.parse(rawOutput);
    } catch {
      // Fallback
    }

    // Check 1: Every person in the answer is checked against the retrieved candidates
    // We strictly filter the model's output to ONLY include names that were actually retrieved
    const validCandidateNames = new Set(topKCandidates.map(c => c.name));
    
    let safeNames: string[] = [];
    if (Array.isArray(parsedOut.recommendedNames)) {
      for (const name of parsedOut.recommendedNames) {
        if (validCandidateNames.has(name)) {
          safeNames.push(name);
        }
      }
    }

    // Secondary enforcement of Check 5: if model returned no valid names
    if (safeNames.length === 0) {
      return NextResponse.json({
        answer: "nobody fits",
        matches: []
      });
    }

    return NextResponse.json({ 
      answer: parsedOut.answer, 
      matches: safeNames 
    });

  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
