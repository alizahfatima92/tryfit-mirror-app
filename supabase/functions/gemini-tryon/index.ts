// Edge function: gemini-tryon
// Receives two base64 images (person + clothing item), calls Google Gemini
// (gemini-2.5-flash-image) to realistically dress the person, and returns the
// generated image as base64. The GEMINI_API_KEY secret stays server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT =
  "You are a virtual fitting room. You are given two images: the FIRST is a photo of a person, " +
  "the SECOND is a photo of a clothing item or accessory. Realistically dress the person in the " +
  "clothing item shown in the second image. Keep the person's face, body shape, skin tone, and " +
  "background as natural and unchanged as possible. Make the clothing fit naturally with realistic " +
  "folds, shadows, and lighting that matches the original photo. Return ONLY the resulting image.";

interface TryOnRequest {
  personImage: string; // base64 (no data: prefix)
  personMime: string;
  clothingImage: string; // base64 (no data: prefix)
  clothingMime: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as TryOnRequest;
    if (!body.personImage || !body.clothingImage) {
      return new Response(
        JSON.stringify({ error: "Both personImage and clothingImage are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: body.personMime || "image/jpeg", data: body.personImage } },
            { inline_data: { mime_type: body.clothingMime || "image/jpeg", data: body.clothingImage } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    };

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error (${geminiRes.status}): ${errText.slice(0, 500)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiJson = await geminiRes.json();
    const parts = geminiJson?.candidates?.[0]?.content?.parts ?? [];
    let imageBase64: string | null = null;
    let imageMime = "image/png";
    let text: string | null = null;

    for (const part of parts) {
      if (part.inline_data?.data) {
        imageBase64 = part.inline_data.data;
        imageMime = part.inline_data.mime_type || imageMime;
      } else if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        imageMime = part.inlineData.mimeType || imageMime;
      } else if (part.text) {
        text = part.text;
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          error: "Gemini did not return an image. " + (text ? `Model said: ${text}` : "Please try again."),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ image: imageBase64, mime: imageMime, text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
