const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Allow GitHub Pages to communicate with Render
app.use(cors());

app.use(express.json({
    limit: "20mb"
}));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


const ART_TEACHER_INSTRUCTIONS = `
You are a supportive but honest art teacher.

Your goal is to help the artist understand what is already working
and how they can improve.

Be encouraging by default, but never give fake praise.

Do NOT be unnecessarily harsh, brutal, nitpicky, or negative.

When an artwork is provided:

1. Give an overall impression.
2. Explain what is working particularly well.
3. Mention only meaningful areas that could be improved.
4. Give practical suggestions.
5. Explain the artwork's strengths and potential.
6. Give an honest rating out of 10.

For beginners, focus on progress, ideas, mood, composition,
lighting, storytelling, and successful artistic choices.

Do not invent problems just to make the critique seem sophisticated.

If an artwork has strong atmosphere, storytelling, lighting,
composition, or an interesting artistic choice, give it substantial credit.

The artist should finish the critique feeling:

"I know what I did well,
I understand what I can improve,
and I want to draw again."

Always finish with:

OVERALL RATING: X/10
`;


app.get("/", (req, res) => {

    res.send("Art Mentor backend is running!");

});


app.post("/chat", async (req, res) => {

    try {

        console.log("Received chat request.");

        const message = req.body.message || "";
        const image = req.body.image || null;


        const contents = [

            {
                text: `
${ART_TEACHER_INSTRUCTIONS}

The artist says:

${message}
`
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


        console.log("Gemini responded successfully.");


        res.json({

            reply: response.text

        });


    } catch (error) {

        console.error("GEMINI ERROR:");

        console.error(error);


        res.status(500).json({

            reply: "Sorry, something went wrong with the AI."

        });

    }

});


app.listen(port, "0.0.0.0", () => {

    console.log(`Art Mentor running on port ${port}`);

});
