const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

const scenarios = {
    "casual": {
        title: "Günlük Sohbet",
        context: "Practice everyday conversations",
        examples: ["How are you?", "What did you do today?"],
        responses: {
            "How are you?": ["I'm fine, thank you!", "I'm doing well, how about you?"],
            "What did you do today?": ["I went to work/school", "I had a busy day"]
        }
    },
    "restaurant": {
        title: "Restoranda",
        context: "Order food, ask about menu",
        examples: ["Can I see the menu?", "I would like to order"],
        responses: {
            "Can I see the menu?": ["Here's the menu, sir/madam", "Would you like today's specials?"],
            "I would like to order": ["I'll have the pasta", "Could I get a burger, please?"]
        }
    },
    "shopping": {
        title: "Alışveriş",
        context: "Shopping dialogues and asking prices",
        examples: ["How much is this?", "Do you have this in blue?"],
        responses: {
            "How much is this?": ["It's $20", "The price is £15"],
            "Do you have this in blue?": ["Yes, we have it in blue", "Let me check the stock"]
        }
    },
    "directions": {
        title: "Yön Sorma",
        context: "Asking and giving directions",
        examples: ["Where is the bank?", "How can I get to the station?"],
        responses: {
            "Where is the bank?": ["It's next to the post office", "Go straight and turn right"],
            "How can I get to the station?": ["Take the first left", "It's a 5-minute walk from here"]
        }
    },
    "emergency": {
        title: "Acil Durumlar",
        context: "Emergency situations and asking for help",
        examples: ["I need help!", "Where is the nearest hospital?"],
        responses: {
            "I need help!": ["What's wrong?", "How can I help you?"],
            "Where is the nearest hospital?": ["It's on Main Street", "I can show you the way"]
        }
    }
};

let userLevel = 1;
let newWords = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ status: 'API is working' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/scenarios', (req, res) => {
    res.json(scenarios);
});

app.post('/chat', async (req, res) => {
    try {
        const { message, scenario } = req.body;
        console.log('Received request:', { message, scenario }); // Debug log

        const scenarioContext = scenarios[scenario]?.context || scenarios.casual.context;

        console.log('Making API request to Claude...'); // Debug log
        const completion = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            messages: [{
                role: "assistant",
                content: `You are helping someone practice English in a ${scenario} scenario.
                    Context: ${scenarioContext}
                    Current level: ${userLevel} (Beginner:1-2, Intermediate:3-4, Advanced:5)
                    Instructions:
                    - Stay in context of the ${scenario} scenario
                    - Use vocabulary appropriate for their level
                    - Mark new vocabulary words with **word**
                    - After your response, suggest 2-3 example responses the student could use
                    - Format example responses as: "You could say: [example1] or [example2]"
                    - Be encouraging and patient`
            }, {
                role: "user",
                content: message
            }]
        });

        console.log('Received API response:', completion); // Debug log

        if (!completion || !completion.messages || !completion.messages[0]) {
            throw new Error('Invalid API response structure');
        }

        const content = completion.messages[0].content;
        let processedContent = content;

        // Process new words
        const newWordsFound = content.match(/\*\*(.*?)\*\*/g) || [];
        newWordsFound.forEach(word => {
            const cleanWord = word.replace(/\*\*/g, '');
            newWords.add(cleanWord);
            processedContent = processedContent.replace(word, `<span class="new-word">${cleanWord}</span>`);
        });

        // Level progression
        if (newWords.size > (userLevel * 10) && userLevel < 5) {
            userLevel++;
            console.log('Level increased to:', userLevel); // Debug log
        }

        const response = {
            content: processedContent,
            level: userLevel,
            newWordsCount: newWords.size,
            examples: scenarios[scenario]?.examples || []
        };

        console.log('Sending response:', response); // Debug log
        res.json(response);

    } catch (error) {
        console.error('Error in /chat endpoint:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.toString(),
            stack: error.stack
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('API Key status:', process.env.CLAUDE_API_KEY ? 'Present' : 'Missing');
});
