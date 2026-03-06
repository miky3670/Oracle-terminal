import functions_framework
import requests
import time
from datetime import datetime
from supabase import create_client, Client
import google.generativeai as genai

# --- KONFIGURACE ---
SUPABASE_URL = "https://zrbqhhnxshrayctqmncy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE2MjcsImV4cCI6MjA4NzI1NzYyN30.7JA6rGog3TphPqdb3tbHz4D03haXSFWZOXwi2yK_uek"
GEMINI_API_KEY = "AIzaSyAm3Z-a9fv3uqX8w1Ww3yk-VJJ5nVYd-UI"

# Inicializace nového motoru (Google AI Studio)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash") # Nejrychlejší a stabilní pro Free Tier

@functions_framework.http
def oracle_brain_func(request):
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

    # 1. INICIALIZACE SUPABASE
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --- ORACLE TERMINAL: KONTEXTOVÝ MOZEK (v40.0 - Fénix) ---
    try:
        config_data = ""
        
        # Načtení technických settings
        sett_res = supabase.table("oracle_settings").select("*").execute()
        if sett_res.data:
            config_data += "TECHNICKÉ NASTAVENÍ A ZŮSTATKY (SETTINGS):\n"
            for item in sett_res.data:
                config_data += f"- {item.get('id')}: {item.get('value')}\n"

        # Načtení tvých osobních pokynů a identit
        conf_res = supabase.table("oracle_configuration").select("*").execute()
        if conf_res.data:
            config_data += "\nOSOBNÍ POKYNY A FAKTA (CONFIGURATION):\n"
            for item in conf_res.data:
                config_data += f"- {item.get('key')}: {item.get('value')}\n"

        chat_check = supabase.table("oracle_chat").select("*").eq("status", "waiting").execute()
        
        if chat_check.data and len(chat_check.data) > 0:
            row = chat_check.data[0]
            otazka = row.get("user_query")
            if otazka:
                prompt = (
                    f"Jsi Oracle Terminal. Aktuální čas: {datetime.now().strftime('%d. %m. %Y %H:%M')}.\n"
                    f"{config_data}\n"
                    f"Na základě těchto REÁLNÝCH dat odpověz na: {otazka}"
                )
                ai_response = model.generate_content(prompt)
                supabase.table("oracle_chat").update({
                    "vertex_response": ai_response.text,
                    "status": "done"
                }).eq("id", row["id"]).execute()
                
                if mode == 'chat':
                    return ("Chat vyřízen bleskově novým motorem", 200, headers)

    except Exception as e:
        print(f"Terminal Error: {e}")

    if mode == 'chat':
        return ("Ping prijat, zadna zprava k vyrizeni", 200, headers)

    # 2. OSTRÁ ANALÝZA ASSETŮ
    try:
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
            if price <= 0: continue

            # Hype analýza s novým modelem
            time.sleep(1.0) # Pauza pro Free Tier
            h_res = model.generate_content(f"Current internet sentiment score 0-100 for {sym}. Only number.")
            h_digits = ''.join(filter(str.isdigit, h_res.text))
            h_score = int(h_digits) if h_digits else 50
            
            supabase.table("oracle_hype").upsert({"symbol": sym, "score": h_score, "last_update": datetime.utcnow().isoformat()}).execute()

            for tf in timeframes:
                time.sleep(1.0) # Pauza pro Free Tier stabilitu
                ai_sig = model.generate_content(f"{sym} {tf} price {price} USD, hype {h_score}. {GLOBAL_CONTEXT}")
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
        except Exception as e: 
            print(f"Asset Error {sym}: {e}")
            continue

    return ("OK - Restartovaný Oracle Terminal v40.0 aktivní", 200, headers)
    app = oracle_brain_func
