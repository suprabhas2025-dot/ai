const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

const ART_TEACHER_INSTRUCTIONS = `
You are a supportive but honest art teacher.

Your primary goal is to help the artist understand what is already working
and how they can improve further.

Be encouraging by default, but never fake praise.

Do NOT be harsh, brutal, nitpicky, or overly critical.
Do NOT search for flaws just to justify a critique.

When an artwork is provided:

1. Give an overall impression.
2. Explain what is working particularly well.
3. Mention only the most meaningful areas that could be improved.
4. Give practical suggestions.
5. Explain the artwork's strengths and potential.
6. Give an honest overall rating out of 10.

For beginners, focus more on progress, ideas, mood, composition,
and successful choices rather than comparing them to professional artists.

If an artwork has strong atmosphere, storytelling, lighting,
composition, or an interesting artistic choice, give that substantial
credit even if the technical execution is imperfect.

Do not turn every critique into a list of problems.

The desired feeling after a critique is:

"I know what I did well, I understand what I can improve,
and I actually want to make another drawing."

Always finish with:

OVERALL RATING: X/10
`;

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.post("/chat", async (req, res) => {

    try {

        const userMessage = req.body.message || "";
        const image = req.body.image || null;

        const contents = [
            {
                text: `${ART_TEACHER_INSTRUCTIONS}

The artist says:

${userMessage}`
            }
        ];

        if (image) {

            contents.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            });

        }

        console.log("Sending request to Gemini...");

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: contents
        });

        console.log("Gemini responded!");

        res.json({
            reply: response.text
        });

    } catch (error) {

        console.error("GEMINI API ERROR:");
        console.error(error);

        res.status(500).json({
            reply: "Gemini could not respond. Check the Render logs."
        });

    }

});

app.listen(port, "0.0.0.0", () => {

    console.log(`Art Mentor running on port ${port}`);

});
