from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import anthropic
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))

# Scenarios data
scenarios = {
    "casual": {
        "title": "Günlük Sohbet",
        "context": "Practice everyday conversations",
        "examples": ["How are you?", "What did you do today?"]
    },
    "restaurant": {
        "title": "Restoranda",
        "context": "Order food, ask about menu",
        "examples": ["Can I see the menu?", "I would like to order"]
    },
    "shopping": {
        "title": "Alışveriş",
        "context": "Shopping dialogues",
        "examples": ["How much is this?", "Do you have this in blue?"]
    }
}

# Global variables
user_level = 1
new_words = set()

@app.route('/')
def home():
    return send_file('index.html')

@app.route('/scenarios', methods=['GET'])
def get_scenarios():
    return jsonify(scenarios)

@app.route('/chat', methods=['POST'])
def chat():
    global user_level, new_words
    try:
        data = request.json
        message = data.get('message')
        scenario = data.get('scenario')

        # Create message with Claude
        completion = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1000,
            system=f"""You are helping someone practice English in a {scenario} scenario.
                    Context: {scenarios[scenario]['context']}
                    Current level: {user_level} (Beginner:1-2, Intermediate:3-4, Advanced:5)
                    Instructions:
                    - Stay in context of the {scenario} scenario
                    - Use vocabulary appropriate for their level
                    - Mark new vocabulary words with **word**
                    - After your response, suggest 2-3 example responses
                    - Format example responses as: "You could say: [example1] or [example2]"
                    - Be encouraging and patient""",
            messages=[{"role": "user", "content": message}]
        )

        content = completion.content[0].text

        # Process new words
        import re
        new_words_found = re.findall(r'\*\*(.*?)\*\*', content)
        for word in new_words_found:
            new_words.add(word)
            content = content.replace(f"**{word}**", f'<span class="new-word">{word}</span>')

        # Level progression
        if len(new_words) > (user_level * 10) and user_level < 5:
            user_level += 1

        return jsonify({
            'content': content,
            'level': user_level,
            'newWordsCount': len(new_words)
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
