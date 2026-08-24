import { createServerFn } from "@tanstack/react-start";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type AnalyzeInput = { document_text: string; doc_type: string };

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: AnalyzeInput) => {
    if (!input || typeof input.document_text !== "string" || !input.document_text.trim()) {
      throw new Error("document_text is required");
    }
    const doc_type = typeof input.doc_type === "string" && input.doc_type ? input.doc_type : "Rental Agreement";
    return { document_text: input.document_text, doc_type };
  })
  .handler(async ({ data }) => {
    const { document_text, doc_type } = data;
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY secret");

    // THE RUBRIC — legal/compliance knowledge, in plain English.
    const systemPrompt = `You are a document-review assistant for an Indian real estate brokerage and legal team.
You review property agreements and flag compliance gaps and risks FOR HUMAN REVIEW. You are NOT a lawyer and must NOT give legal advice or declare a document definitively legal or compliant. Your job is to surface issues a human should check.
You will receive the text of a ${doc_type} (Indian context).
STEP 1 — EXTRACT these fields into "extracted" (use null for anything genuinely absent):
- parties: names of the parties (owner/landlord/seller and tenant/buyer)
- property: the property being transacted (address / description)
- consideration: the rent (for rentals) or sale price (for sales), with amount
- security_deposit: deposit amount, if a rental
- term: duration / key dates (start, end, lock-in) or possession/handover date
- key_clauses: a short list of notable clauses present (e.g. maintenance, notice period, termination, penalty)
STEP 2 — CHECK the document against these compliance points and build "flags", an array. For EACH item, output an object: {"item": short name, "status": "OK" | "Missing" | "Attention", "note": one-sentence explanation of what to verify}.
Compliance points to check:
- RERA registration: for sale agreements especially, is a RERA registration number for the project/agent referenced?
- Stamp duty & registration: does the document reference being stamped and registered (mandatory for enforceability)?
- Party identification / KYC: are the parties clearly identified with enough detail (e.g. PAN, address) to support KYC?
- Security deposit norms: for rentals, is the deposit stated, and is it within a reasonable range (many states cap it around 2-3 months' rent)?
- Notice / termination clause: is there a clear notice period and termination process?
- Maintenance & charges: is responsibility for maintenance, utilities, and society charges specified?
- Lock-in / possession clarity: for rentals, is any lock-in clear; for sales, is the possession/handover date clear?
- Penalty / default: are consequences of default or delayed payment specified?
- Red flags: note anything unusual or one-sided (e.g. non-refundable deposit, missing dates, blank amounts, ambiguous ownership).
STEP 3 — Produce:
- "verdict": one short phrase, one of exactly: "Looks Complete", "Minor Gaps", "Needs Review" (choose "Needs Review" if any critical item like RERA, registration, or party identification is Missing).
- "summary": a plain-language paragraph (3-5 sentences) summarizing what the document is, the notable gaps or risks, and what a human should verify before proceeding. End with a reminder that this is an automated review, not legal advice.
Respond with ONLY a valid JSON object, no markdown, no code fences, no commentary, in exactly this shape:
{"extracted": { ... }, "flags": [ ... ], "verdict": "...", "summary": "..."}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Here is the ${doc_type} to review:\n\n${document_text}` }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Anthropic API error: ${res.status} ${errText}`);
      throw new Error("Document analysis service is unavailable. Please try again.");
    }

    const payload = (await res.json()) as { content?: Array<{ text?: string }> };
    const rawText = payload.content?.[0]?.text ?? "";
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as {
      extracted: Record<string, Json>;
      flags: Array<{ item: string; status: string; note: string }>;
      verdict: string;
      summary: string;
    };
  });
