import functions_framework
import requests
import time
import os
from datetime import datetime
from supabase import create_client, Client
import google.generativeai as genai

# --- KONFIGURACE ---
SUPABASE_URL = "https://zrbqhhnxshrayctqmncy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4MTYyNywiZXhwIjoyMDg3MjU3NjI3fQ.dR9JJIeVkLE917TX85-yGRo0Cw-Ix9_DOlRveOC0xFw"

# Bezpečné načtení klíče
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
except Exception as e:
    print(f"AI Error: {e}")

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

@functions_framework.http
def oracle_brain_func(request, context=None):
    # Sjednocení vstupu pro Vercel
    if isinstance(request, dict):
        method = request.get('httpMethod', request.get('method', 'GET'))
        args = request.get('queryStringParameters', request.get('args', {}))
    else:
        method = getattr(request, 'method', 'GET')
        args = getattr(request, 'args', {})

    # CORS
    if method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    mode = args.get('mode') if args else None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. KONFIGURACE
        config_data = ""
        sett_res = supabase.table("oracle_settings").select("*").execute()
        conf_res = supabase.table("oracle_configuration").select("*").execute()
        for item in (sett_res.data or []): config_data += f"- {item.get('id')}: {item.get('value')}\n"
        for item in (conf_res.data or []): config_data += f"- {item.get('key')}: {item.get('value')}\n"

        # 2. CHAT
        chat_check = supabase.table("oracle_chat").select("*").eq("status", "waiting").execute()
        if chat_check.data:
            row = chat_check.data[0]
            prompt = f"Jsi Oracle Terminal. Čas: {datetime.now().strftime('%H:%M')}.\n{config_data}\nOdpověz na: {row.get('user_query')}"
            ai_res = model.generate_content(prompt, safety_settings=SAFETY_SETTINGS)
            supabase.table("oracle_chat").update({"vertex_response": ai_res.text, "status": "done"}).eq("id", row["id"]).execute()
            if mode == 'chat': return "Chat OK"

        if mode == 'chat': return "Zadne zpravy"

        # 3. ANALÝZA
        res = supabase.table("oracle_settings").select("value").eq("id", "active_assets").single().execute()
        assets = res.data.get('value', ["BTC", "ETH", "SOL", "PI"])

        for sym in assets:
            try:
                r = requests.get(f"https://min-api.cryptocompare.com/data/pricemultifull?fsyms={sym}&tsyms=USD").json()
                if "RAW" not in r: continue
                raw = r["RAW"][sym]["USD"]
                price, change = float(raw["PRICE"]), float(raw["CHANGEPCT24HOUR"])
                
                time.sleep(3) 
                h_res = model.generate_content(f"Sentiment 0-100 for {sym}. Only number.", safety_settings=SAFETY_SETTINGS)
                h_score = int(''.join(filter(str.isdigit, h_res.text)) or 50)
                supabase.table("oracle_hype").upsert({"symbol": sym, "score": h_score, "last_update": datetime.utcnow().isoformat()}).execute()

                for tf in ["1M", "15M", "1H", "1D"]:
                    time.sleep(3) 
                    ai_sig = model.generate_content(f"{sym} {tf} price {price}, hype {h_score}. Format: VERDICT | ANALYSIS. Verdict: BUY/SELL/HOLD. Max 5 words.", safety_settings=SAFETY_SETTINGS)
                    v, a = ai_sig.text.split('|', 1) if '|' in ai_sig.text else ("HOLD", ai_sig.text)
                    supabase.table("oracle_signals").upsert({
                        "symbol": sym, "timeframe": tf, "price": price, "change": change,
                        "verdict": v.strip().upper()[:10], "analysis": a.strip()[:50], "created_at": datetime.utcnow().isoformat()
                    }).execute()
            except: continue

        return "OK - Terminal v41.3"

    except Exception as e:
        return f"Error: {str(e)}"

app = oracle_brain_func
