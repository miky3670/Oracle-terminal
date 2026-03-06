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
GEMINI_API_KEY = "AIzaSyAm3Z-a9fv3uqX8w1Ww3yk-VJJ5nVYd-UI"

# Inicializace Gemini 2.5
try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")
    print("AI Engine: Gemini 2.5 připraven.")
except Exception as e:
    print(f"AI Engine Error: {e}")

# Nastavení bezpečnosti
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

@functions_framework.http
def oracle_brain_func(request, context=None):  # OPRAVA: Přidán parametr context
    # --- CORS HLAVIČKY ---
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}
    mode = request.args.get('mode')
    print(f"DEBUG: Start funkce, mode={mode}")

    # 1. INICIALIZACE SUPABASE S DIAGNOSTIKOU
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("DEBUG: Supabase klient vytvořen.")
    except Exception as e:
        print(f"KRITICKÁ CHYBA SUPABASE INIT: {e}")
        return (f"Chyba pripojeni k DB: {e}", 500, headers)

    # --- ORACLE TERMINAL: MOZEK ---
    try:
        config_data = ""
        # Načtení dat (vše v jednom try bloku pro stabilitu)
        sett_res = supabase.table("oracle_settings").select("*").execute()
        conf_res = supabase.table("oracle_configuration").select("*").execute()
        
        if sett_res.data:
            for item in sett_res.data:
                config_data += f"- {item.get('id')}: {item.get('value')}\n"
        if conf_res.data:
            for item in conf_res.data:
                config_data += f"- {item.get('key')}: {item.get('value')}\n"

        chat_check = supabase.table("oracle_chat").select("*").eq("status", "waiting").execute()
        
        if chat_check.data and len(chat_check.data) > 0:
            row = chat_check.data[0]
            otazka = row.get("user_query")
            if otazka:
                print(f"DEBUG: Zpracovávám dotaz: {otazka[:30]}...")
                prompt = (
                    f"Jsi Oracle Terminal. Čas: {datetime.now().strftime('%d. %m. %Y %H:%M')}.\n"
                    f"{config_data}\n"
                    f"Odpověz na: {otazka}"
                )
                ai_response = model.generate_content(prompt, safety_settings=SAFETY_SETTINGS)
                
                # Uložení odpovědi
                supabase.table("oracle_chat").update({
                    "vertex_response": ai_response.text,
                    "status": "done"
                }).eq("id", row["id"]).execute()
                
                print("DEBUG: Chat úspěšně uložen do DB.")
                if mode == 'chat':
                    return ("Chat vyřízen (Gemini 2.5 Flash)", 200, headers)

    except Exception as e:
        print(f"DEBUG ERROR v hlavní části: {e}")

    if mode == 'chat':
        return ("Ping prijat, zadna zprava k vyrizeni", 200, headers)

    # 2. ANALÝZA ASSETŮ
    try:
        print("DEBUG: Spouštím analýzu assetů.")
        res = supabase.table("oracle_settings").select("value").eq("id", "active_assets").single().execute()
        assets = res.data['value']
    except:
        assets = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "LTC", "PI", "M"]

    timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"]
    GLOBAL_CONTEXT = "Format: VERDICT | ANALYSIS. Verdict: BUY/SELL/HOLD. Max 5 words. No stars."

    for sym in assets:
        try:
            r = requests.get(f"https://min-api.cryptocompare.com/data/pricemultifull?fsyms={sym}&tsyms=USD", timeout=10).json()
            if "RAW" not in r or sym not in r["RAW"]: continue 
            
            raw = r["RAW"][sym]["USD"]
            price, change = float(raw["PRICE"]), float(raw["CHANGEPCT24HOUR"])

            time.sleep(1.2)
            h_res = model.generate_content(f"Sentiment score 0-100 for {sym}. Only number.", safety_settings=SAFETY_SETTINGS)
            h_digits = ''.join(filter(str.isdigit, h_res.text))
            h_score = int(h_digits) if h_digits else 50
            
            supabase.table("oracle_hype").upsert({"symbol": sym, "score": h_score, "last_update": datetime.utcnow().isoformat()}).execute()

            for tf in timeframes:
                time.sleep(1.2)
                ai_sig = model.generate_content(f"{sym} {tf} price {price} USD, hype {h_score}. {GLOBAL_CONTEXT}", safety_settings=SAFETY_SETTINGS)
                raw_text = ai_sig.text.replace("*", "").strip()
                if '|' in raw_text:
                    v, a = raw_text.split('|', 1)
                    v_final, a_final = v.strip().upper()[:10], a.strip()[:50]
                else:
                    v_final, a_final = "HOLD", raw_text[:50]

                supabase.table("oracle_signals").upsert({
                    "symbol": sym, "timeframe": tf, "price": price, "change": change,
                    "verdict": v_final, "analysis": a_final, "created_at": datetime.utcnow().isoformat()
                }).execute()
            print(f"DEBUG: Asset {sym} hotov.")
        except Exception as e:
            print(f"DEBUG ERROR u assetu {sym}: {e}")
            continue

    return ("OK - Oracle v40.5 online", 200, headers)

app = oracle_brain_func
