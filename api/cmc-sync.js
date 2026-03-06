
 
import { createClient } from '@supabase/supabase-js';

// POUŽÍVÁME PŘÍMÉ ADRESY A KLÍČE (Žádné schovávání ve Vercelu)
const supabase = createClient(
  "https://zrbqhhnxshrayctqmncy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE2MjcsImV4cCI6MjA4NzI1NzYyN30.7JA6rGog3TphPqdb3tbHz4D03haXSFWZOXwi2yK_uek"
);

export default async function handler(req, res) {
  // Přidáme CORS hlavičky pro jistotu
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const CMC_API_KEY = 'e2557155-3e80-45ad-8007-e6b1ce9048f8';
  const symbols = 'BTC,ETH,SOL,BNB,XRP,ADA,DOGE,LTC,PI,M';

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
      {
        headers: { 
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `CMC API Error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    const updates = [];
    const symList = symbols.split(',');

    symList.forEach(sym => {
      if (data.data && data.data[sym]) {
        const asset = data.data[sym];
        updates.push({
          symbol: sym,
          volume_24h: parseFloat(asset.quote.USD.volume_24h || 0),
          last_update: new Date().toISOString()
        });
      }
    });

    // PŘÍMÝ ZÁPIS DO SUPABASE
    const { error: sbError } = await supabase.from('oracle_volumes').upsert(updates);

    if (sbError) {
      return res.status(500).json({ error: "Supabase Write Error", details: sbError.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: "MILIARDY JSOU DOMA!", 
      count: updates.length 
    });

  } catch (err) {
    return res.status(500).json({ error: "Server Crash", message: err.message });
  }
}
