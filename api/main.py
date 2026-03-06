import os
from flask import Flask, request, jsonify
from supabase import create_client, Client

app = Flask(__name__)

# --- KONFIGURACE (Vercel si je bere z Environment Variables) ---
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

        # 1. ZÁPIS DO TABULKY - Status 'waiting' je signál pro tvůj NAS
        new_chat = {
            "user_query": user_query,
            "status": "waiting",
            "vertex_response": None  # Sem pak NAS zapíše odpověď
        }
        
        res = supabase.table("oracle_chat").insert(new_chat).execute()
        
        # 2. OKAMŽITÁ ODPOVĚĎ PRO FRONTEND
        # Aplikace teď ví, že má chvíli počkat, než se status změní na 'done'
        return jsonify({
            "message": "Dotaz přijat k analýze.",
            "chat_id": res.data[0]['id'],
            "status": "processing"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()
