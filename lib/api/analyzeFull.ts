export async function analyzeFull({
  frontBase64,
  backBase64,
  sideBase64,
  legsBase64,
}) {
  try {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OpenAI API key");

    // ✅ Validate input
    if (!frontBase64 || !backBase64 || !sideBase64 || !legsBase64) {
      throw new Error("Missing base64 image input");
    }

    // ✅ Build prompt — premium analysis
    const payload = {
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Analyze these four physique images and return ONLY a valid JSON object:

{
  "overallScore": integer 0-100,

  "muscleGroups": {
    "chest": integer 0-100,
    "back": integer 0-100,
    "shoulders": integer 0-100,
    "core": integer 0-100,
    "quads": integer 0-100,
    "hamstrings": integer 0-100,
    "glutes": integer 0-100,
    "calves": integer 0-100,
    "biceps": integer 0-100,
    "triceps": integer 0-100
  },

  "tags": {
    "chest": "Excellent|Strong|Balanced|Developing",
    "back": "Excellent|Strong|Balanced|Developing",
    "shoulders": "Excellent|Strong|Balanced|Developing",
    "core": "Excellent|Strong|Balanced|Developing",
    "quads": "Excellent|Strong|Balanced|Developing",
    "hamstrings": "Excellent|Strong|Balanced|Developing",
    "glutes": "Excellent|Strong|Balanced|Developing",
    "calves": "Excellent|Strong|Balanced|Developing",
    "biceps": "Excellent|Strong|Balanced|Developing",
    "triceps": "Excellent|Strong|Balanced|Developing"
  },

  "imbalances": [
    {
      "name": string,
      "description": string,
      "severity": "Minor|Moderate|Severe"
    }
  ],

  "summary": {
    "strengths": [string],
    "improvements": [string],
    "trainingLevel": string
  },

  "recommendations": [string],

  "bodyMap": {
    "front": {
      "chest": string,
      "shoulders": string,
      "core": string,
      "quads": string,
      "calves": string,
      "biceps": string
    },
    "back": {
      "back": string,
      "hamstrings": string,
      "glutes": string,
      "triceps": string
    }
  }
}

RULES:
- Use only integers (no decimals)
- Keep scores consistent
- Be accurate & realistic
- No markdown
- No explanation
- Output ONLY the JSON object
            `.trim(),
            },

            { type: "input_image", image_url: `data:image/jpeg;base64,${frontBase64}` },
            { type: "input_image", image_url: `data:image/jpeg;base64,${backBase64}` },
            { type: "input_image", image_url: `data:image/jpeg;base64,${sideBase64}` },
            { type: "input_image", image_url: `data:image/jpeg;base64,${legsBase64}` },
          ],
        },
      ],
    };

    // ✅ Call API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Error (Full):", data);
      throw new Error(data?.error?.message || "Full analysis failed");
    }

    // ✅ Extract AI text from all possible structures
    const text =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      data.choices?.[0]?.message?.content ??
      null;

    if (!text || typeof text !== "string") {
      console.error("Full response:", data);
      throw new Error("AI returned no text for full breakdown");
    }

    // ✅ Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON returned (Full):", text);
      throw new Error("Failed to parse premium AI JSON");
    }

    return parsed;
  } catch (err) {
    console.error("analyzeFull ERROR:", err);
    throw err;
  }
}
