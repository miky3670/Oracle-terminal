import os
import requests
from flask import Flask, request, jsonify
from supabase import create_client, Client

app = Flask(__name__)

# Konfigurace z Vercel Environment Variables
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_query = data.get('query')
        
        if not user_query:
            return jsonify({"error": "Chybí dotaz"}), 400

        # --- PING NA GEMINI 2.5 FLASH-LITE (Okamžitá odpověď) ---
        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"Jsi Oracle Terminal pro projekt Core Pulse for Pi. Odpovídej věcně. Dotaz: {user_query}"}]}]
        }
        
        # Timeout 10s je pro Flash-Lite víc než dost
        response = requests.post(url, json=payload, timeout=10)
        ai_res = response.json()['candidates'][0]['content']['parts'][0]['text']

        # --- ZÁPIS DO SUPABASE (Pro historii, už jako 'done') ---
        chat_entry = {
            "user_query": user_query,
            "vertex_response": ai_res,
            "status": "done"
        }
        supabase.table("oracle_chat").insert(chat_entry).execute()

        # Vrátíme odpověď aplikaci hned
        return jsonify({
            "response": ai_res,
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
