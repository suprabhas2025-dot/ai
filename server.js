const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());

app.use(express.json({
    limit: "20mb"
}));

app.use(express.static("public"));

const MEMORY_FILE = path.join(__dirname, "memory.json");


function emptyMemory() {
    return {
        artistProfile: {
            goals: [],
            strengths: [],
            weaknesses: [],
            preferences: [],
            currentFocus: []
        },
        importantMemories: []
    };
}


function loadMemory() {

    try {

        if (!fs.existsSync(MEMORY_FILE)) {

            const memory = emptyMemory();

            fs.writeFileSync(
                MEMORY_FILE,
                JSON.stringify(memory, null, 2)
            );

            return memory;
        }

        return JSON.parse(
            fs.readFileSync(MEMORY_FILE, "utf8")
        );

    } catch (error) {

        console.error("Memory loading error:", error);

        return emptyMemory();

    }
}


function saveMemory(memory) {

    try {

        fs.writeFileSync(
            MEMORY_FILE,
            JSON.stringify(memory, null, 2)
        );

        console.log("Memory saved.");

    } catch (error) {

        console.error("Memory saving error:", error);

    }

}


let memory = loadMemory();


const ART_TEACHER_INSTRUCTIONS = `
You are Art Mentor, a supportive but honest art teacher.

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


app.get("/memory", (req, res) => {

    res.json(memory);

});


app.post("/chat", async (req, res) => {

    try {

        const message = req.body.message || "";
        const image = req.body.image || null;
        const privateMode = req.body.privateMode === true;


        console.log(
            privateMode
                ? "Private chat request."
                : "Normal chat request."
        );


        let memoryText = "No artist memory is available.";

        if (!privateMode) {

            memoryText = JSON.stringify(
                memory,
                null,
                2
            );

        }


        const prompt = `

${ART_TEACHER_INSTRUCTIONS}

ARTIST MEMORY:

${memoryText}

Use the artist memory when it is relevant.

Do not mention the memory system unless the artist
specifically asks about it.

CURRENT MESSAGE:

${message}

`;


        const contents = [
            {
                text: prompt
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


        const response =
            await ai.models.generateContent({

                model: "gemini-3.1-flash-lite",

                contents: contents

            });


        const reply = response.text;


        /*
         * PRIVATE MODE:
         *
         * Do not create or update memories.
         */

        if (!privateMode) {

            try {

                const memoryResponse =
                    await ai.models.generateContent({

                        model: "gemini-3.1-flash-lite",

                        contents: [

                            {

                                text: `

You maintain long-term memory for an AI art teacher.

Current artist memory:

${JSON.stringify(memory, null, 2)}

Latest conversation:

Artist:
${message}

Art Mentor:
${reply}

Identify ONLY durable information worth remembering.

Remember things such as:

- artistic goals
- artistic preferences
- recurring strengths
- recurring weaknesses
- current areas of practice
- meaningful artistic progress

Do NOT remember:

- casual conversation
- temporary emotions
- individual image descriptions
- random facts
- sensitive personal information

Return ONLY valid JSON:

{
  "artistProfile": {
    "goals": [],
    "strengths": [],
    "weaknesses": [],
    "preferences": [],
    "currentFocus": []
  },
  "importantMemories": []
}

Do not delete useful existing memories.

`

                            }

                        ]

                    });


                let memoryText =
                    memoryResponse.text.trim();


                memoryText =
                    memoryText
                        .replace(/^```json\s*/i, "")
                        .replace(/^```\s*/i, "")
                        .replace(/\s*```$/i, "")
                        .trim();


                const newMemory =
                    JSON.parse(memoryText);


                memory =
                    mergeMemory(
                        memory,
                        newMemory
                    );


                saveMemory(memory);

            } catch (memoryError) {

                console.error(
                    "Memory update skipped:",
                    memoryError.message
                );

            }

        } else {

            console.log(
                "Private mode: memory was not updated."
            );

        }


        res.json({

            reply: reply

        });


    } catch (error) {

        console.error("GEMINI ERROR:");
        console.error(error);

        res.status(500).json({

            reply:
                "Sorry, something went wrong with the AI."

        });

    }

});


function mergeMemory(oldMemory, newMemory) {

    const categories = [
        "goals",
        "strengths",
        "weaknesses",
        "preferences",
        "currentFocus"
    ];


    for (const category of categories) {

        const oldItems =
            oldMemory.artistProfile[category] || [];

        const newItems =
            newMemory.artistProfile?.[category] || [];


        for (const item of newItems) {

            if (
                typeof item === "string" &&
                item.trim() &&
                !oldItems.includes(item)
            ) {

                oldItems.push(item);

            }

        }


        oldMemory.artistProfile[category] =
            oldItems.slice(-20);

    }


    const oldMemories =
        oldMemory.importantMemories || [];

    const newMemories =
        newMemory.importantMemories || [];


    for (const item of newMemories) {

        if (
            typeof item === "string" &&
            item.trim() &&
            !oldMemories.includes(item)
        ) {

            oldMemories.push(item);

        }

    }


    oldMemory.importantMemories =
        oldMemories.slice(-30);


    return oldMemory;

}


app.listen(
    port,
    "0.0.0.0",
    () => {

        console.log(
            `Art Mentor running on port ${port}`
        );

    }
);
