const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();

// API key'i kontrol etmek için log
console.log('Initializing with API Key:', process.env.CLAUDE_API_KEY);

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

// Test endpoint to verify API key
app.get('/test-api', async (req, res) => {
   try {
       console.log('Testing API connection...');
       const response = await anthropic.messages.create({
           model: "claude-3-opus-20240229",
           messages: [{
               role: "user",
               content: "Hello"
           }]
       });
       res.json({ status: 'API working', response });
   } catch (error) {
       console.error('API Test Error:', error);
       res.status(500).json({ 
           error: 'API test failed',
           details: error.message
       });
   }
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
       
       // Log the incoming request
       console.log('Chat Request:', {
           message,
           scenario,
           apiKey: process.env.CLAUDE_API_KEY ? 'Present' : 'Missing'
       });

       // Make the API call
     const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",  // Daha basit bir model kullanalım
    messages: [{
        role: "user",
        content: message
    }],
    max_tokens: 1000
});

       // Log the API response
       console.log('Claude API Response:', {
           status: response ? 'Received' : 'Empty',
           content: response?.content
       });

       // Extract the response text
       const responseText = response?.content?.[0]?.text || 'No response received';

       // Send the response
       res.json({
           content: responseText,
           level: userLevel,
           newWordsCount: newWords.size
       });

   } catch (error) {
       // Detailed error logging
       console.error('Chat Error:', {
           message: error.message,
           stack: error.stack,
           type: error.constructor.name
       });

       res.status(500).json({ 
           error: 'Failed to get response',
           details: error.message
       });
   }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
   console.log('Environment check:', {
       port: PORT,
       apiKey: process.env.CLAUDE_API_KEY ? 'Present' : 'Missing'
   });
});
