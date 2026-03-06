import functions_framework
import requests
import os
from datetime import datetime
from supabase import create_client, Client
import google.generativeai as genai

# --- KONFIGURACE ---
SUPABASE_URL = "https://zrbqhhnxshrayctqmncy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4MTYyNywiZXhwIjoyMDg3MjU3NjI3fQ.dR9JJIeVkLE917TX85-yGRo0Cw-Ix9_DOlRveOC0xFw"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

@functions_framework.http
def oracle_brain_func(request, context=None):
    # --- UNIVERZÁLNÍ ZÍSKÁNÍ DAT ---
    if isinstance(request, dict):
        args = request.get('queryStringParameters', {})
        method = request.get('httpMethod', 'GET')
    else:
        args = getattr(request, 'args', {})
        method = getattr(request, 'method', 'GET')

    # CORS (Vracíme surové bajty, Vercel to tak u Pythonu 3.12 vyžaduje)
    if method == 'OPTIONS':
        return (b'OK', 204, {'Access-Control-Allow-Origin': '*'})

    mode = args.get('mode') if args else None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. NAČTENÍ KONFIGURACE
        config_data = ""
        sett_res = supabase.table("oracle_settings").select("*").execute()
        conf_res = supabase.table("oracle_configuration").select("*").execute()
        for item in (sett_res.data or []): config_data += f"- {item.get('id')}: {item.get('value')}\n"
        for item in (conf_res.data or []): config_data += f"- {item.get('key')}: {item.get('value')}\n"

        # 2. CHAT MOD
        chat_check = supabase.table("oracle_chat").select("*").eq("status", "waiting").execute()
        if chat_check.data:
            row = chat_check.data[0]
            prompt = f"Jsi Oracle Terminal. Odpověz na: {row.get('user_query')}\nKontext: {config_data}"
            ai_res = model.generate_content(prompt, safety_settings=SAFETY_SETTINGS)
            supabase.table("oracle_chat").update({"vertex_response": ai_res.text, "status": "done"}).eq("id", row["id"]).execute()
            if mode == 'chat':
                return b"Chat OK"

        if mode == 'chat':
            return b"Zadne zpravy"

        # 3. ANALÝZA ASSETŮ (Bleskově bez pauz)
        res = supabase.table("oracle_settings").select("value").eq("id", "active_assets").single().execute()
        assets = res.data.get('value', ["XRP"])

        for sym in assets:
            try:
                r = requests.get(f"https://min-api.cryptocompare.com/data/pricemultifull?fsyms={sym}&tsyms=USD").json()
                if "RAW" not in r: continue
                raw = r["RAW"][sym]["USD"]
                price, change = float(raw["PRICE"]), float(raw["CHANGEPCT24HOUR"])
                
                # Jeden kombinovaný dotaz pro rychlost
                ai_prompt = (
                    f"Analyze {sym} at price {price} USD. Return exact 5 lines format, no markdown:\n"
                    f"HYPE: [0-100 score]\n"
                    f"1M: [BUY/SELL/HOLD] | [Max 5 words analysis]\n"
                    f"15M: [BUY/SELL/HOLD] | [Max 5 words analysis]\n"
                    f"1H: [BUY/SELL/HOLD] | [Max 5 words analysis]\n"
                    f"1D: [BUY/SELL/HOLD] | [Max 5 words analysis]"
                )
                
                ai_sig = model.generate_content(ai_prompt, safety_settings=SAFETY_SETTINGS)
                lines = ai_sig.text.strip().split('\n')
                
                h_score = 50
                sig_data = {"1M": "HOLD | Data pending", "15M": "HOLD | Data pending", "1H": "HOLD | Data pending", "1D": "HOLD | Data pending"}
                
                for line in lines:
                    line = line.replace("*", "").strip()
                    if line.startswith("HYPE:"):
                        digits = ''.join(filter(str.isdigit, line))
                        h_score = int(digits) if digits else 50
                    elif line.startswith("1M:"): sig_data["1M"] = line.split("1M:")[1].strip()
                    elif line.startswith("15M:"): sig_data["15M"] = line.split("15M:")[1].strip()
                    elif line.startswith("1H:"): sig_data["1H"] = line.split("1H:")[1].strip()
                    elif line.startswith("1D:"): sig_data["1D"] = line.split("1D:")[1].strip()

                supabase.table("oracle_hype").upsert({"symbol": sym, "score": h_score, "last_update": datetime.utcnow().isoformat()}).execute()

                for tf in ["1M", "15M", "1H", "1D"]:
                    v_txt = sig_data[tf]
                    v, a = v_txt.split('|', 1) if '|' in v_txt else ("HOLD", v_txt)
                    
                    supabase.table("oracle_signals").upsert({
                        "symbol": sym, "timeframe": tf, "price": price, "change": change,
                        "verdict": v.strip().upper()[:10], "analysis": a.strip()[:50], "created_at": datetime.utcnow().isoformat()
                    }).execute()
            except Exception as e:
                print(f"Error u {sym}: {e}")
                continue

        return b"OK - Oracle Terminal v42.1"

    except Exception as e:
        # Převedeme chybovou hlášku natvrdo na bajty
        return str(e).encode('utf-8')

app = oracle_brain_func
