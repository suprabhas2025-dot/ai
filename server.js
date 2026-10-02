const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = 3000;

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

A weakness should only be mentioned if improving it would meaningfully
make the artwork better.

For beginners, focus more on progress, ideas, mood, composition and
successful choices rather than comparing them to professional artists.

If an artwork has strong atmosphere, storytelling, lighting, composition,
or an interesting artistic choice, give that substantial credit even if
the technical execution is imperfect.

Do not turn every critique into a list of problems.

The desired feeling after a critique is:

"I know what I did well, I understand what I can improve,
and I actually want to make another drawing."

Always finish with:

OVERALL RATING: X/10
`;

app.post("/chat", async (req, res) => {

    try {

        const userMessage = req.body.message || "";
        const image = req.body.image;

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

        const response = await ai.models.generateContent({
            model: "models/gemini-3.1-flash-lite",
            contents: contents
        });

        console.log("Art Mentor responded!");

        res.json({
            reply: response.text
        });

    } catch (error) {

        console.error("Gemini API ERROR:");
        console.error(error);

        res.status(500).json({
            reply: "Sorry, something went wrong."
        });

    }

});

app.listen(port, () => {

    console.log(`Art Mentor running at http://localhost:${port}`);

});