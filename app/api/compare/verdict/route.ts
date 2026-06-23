import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { colleges, priorities } = await req.json();

    if (!colleges || !Array.isArray(colleges) || colleges.length === 0) {
      return NextResponse.json(
        { error: "Colleges data is required for a verdict" },
        { status: 400 }
      );
    }

    // Explicitly command Gemini to output the payload keys expected by VerdictPanel
    const prompt = `
      You are an expert academic advisor. Compare the following colleges based on these user priorities: ${JSON.stringify(priorities)}.
      
      Colleges data: ${JSON.stringify(colleges)}

      You MUST respond with a valid JSON object matching this EXACT structural schema. Do not wrap the JSON response in markdown code blocks.

      Required JSON Schema:
      {
        "verdict": {
          "winner": "Name of the recommended college",
          "winnerName": "Name of the recommended college (same as winner)",
          "summary": "A comprehensive summary explaining why this college wins based on user priorities.",
          "breakdown": [
            {
              "collegeName": "Name of College 1",
              "pros": ["Pro point 1", "Pro point 2"],
              "cons": ["Con point 1", "Con point 2"]
            },
            {
              "collegeName": "Name of College 2",
              "pros": ["Pro point 1", "Pro point 2"],
              "cons": ["Con point 1", "Con point 2"]
            }
          ],
          "finalTake": "A brief, impactful concluding piece of advice for the student."
        }
      }
    `;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI comparison service is currently unconfigured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);
      return NextResponse.json({ error: "Failed to query Gemini" }, { status: 500 });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    // Parse the data out cleanly matching the frontend expectations
    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);

  } catch (error) {
    console.error("Error in verdict route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}