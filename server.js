const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Allow GitHub Pages to communicate with Render
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message || "";
        const image = req.body.image;

        const contents = [
            {
                text: `You are a supportive but honest art teacher.

Give an honest art critique.

Focus on:
1. Overall impression
2. What works well
3. Important improvements
4. Practical suggestions
5. Potential
6. Honest rating out of 10

Do not invent problems just to criticize.
Do not be unnecessarily harsh.

Always finish with:

OVERALL RATING: X/10

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
    console.log(`Art Mentor running on port ${port}`);
});
