const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

const scenarios = {
    "casual": {
        title: "Günlük Sohbet",
        context: "Practice everyday conversations",
        examples: ["How are you?", "What did you do today?"]
    },
    "restaurant": {
        title: "Restoranda",
        context: "Order food, ask about menu",
        examples: ["Can I see the menu?", "I would like to order"]
    },
    "shopping": {
        title: "Alışveriş",
        context: "Shopping dialogues",
        examples: ["How much is this?", "Do you have this in blue?"]
    },
    "directions": {
        title: "Yön Sorma",
        context: "Asking for directions",
        examples: ["Where is the bank?", "How can I get to the station?"]
    }
};

let userLevel = 1;
let newWords = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/scenarios', (req, res) => {
    res.json(scenarios);
});

app.post('/chat', async (req, res) => {
    try {
        const { message, scenario } = req.body;
        console.log('Received chat request:', { message, scenario });

        const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            messages: [{
                role: "user",
                content: message
            }]
        });

        console.log('Claude Response:', response);

        const aiMessage = response.content[0].text;
        
        res.json({
            content: aiMessage,
            level: userLevel,
            newWordsCount: newWords.size
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ 
            error: 'Failed to get response',
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('API Key:', process.env.CLAUDE_API_KEY ? 'Present' : 'Missing');
});
