const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();

// API key'i hem config hem env'den okuyalım
let apiKey;
try {
    const config = require('./config');
    apiKey = config.CLAUDE_API_KEY;
} catch (error) {
    apiKey = process.env.CLAUDE_API_KEY;
}

const anthropic = new Anthropic({
    apiKey: apiKey
});

// Test message to verify API
async function testAPI() {
    try {
        const msg = await anthropic.messages.create({
            messages: [{ role: 'user', content: 'Hi' }],
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
        });
        console.log("API Test Success:", msg);
        return true;
    } catch (error) {
        console.error("API Test Failed:", error);
        return false;
    }
}

// Test API when starting server
testAPI();

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
        console.log('Received request:', req.body);
        const { message, scenario } = req.body;

        const response = await anthropic.messages.create({
            messages: [{ 
                role: 'user', 
                content: message 
            }],
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            temperature: 0.7,
        });

        console.log('API Response:', response);

        res.json({
            content: response.content[0].text,
            level: userLevel,
            newWordsCount: newWords.size
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ 
            error: 'Failed to get response',
            details: error.message,
            stack: error.stack
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('API Key status:', process.env.CLAUDE_API_KEY ? 'Present' : 'Missing');
});
