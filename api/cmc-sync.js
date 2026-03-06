import { createClient } from '@supabase/supabase-js';

// Inicializace Supabase
const supabase = createClient(
  "https://zrbqhhnxshrayctqmncy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE2MjcsImV4cCI6MjA4NzI1NzYyN30.7JA6rGog3TphPqdb3tbHz4D03haXSFWZOXwi2yK_uek"
);

export default async function handler(req, res) {
  // TVŮJ API KLÍČ Z COINMARKETCAP
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

    const data = await response.json();
    
    if (data.status && data.status.error_code !== 0) {
        throw new Error(data.status.error_message);
    }

    const updates = [];
    const symList = symbols.split(',');

    symList.forEach(sym => {
      const asset = data.data[sym];
      if (asset && asset.quote && asset.quote.USD) {
        updates.push({
          symbol: sym,
          volume_24h: parseFloat(asset.quote.USD.volume_24h),
          last_update: new Date().toISOString()
        });
      }
    });

    // Hromadný zápis do Supabase (Upsert do tabulky oracle_volumes)
    const { error } = await supabase.from('oracle_volumes').upsert(updates, { onConflict: 'symbol' });

    if (error) throw error;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ 
        status: 'Synchronizace CMC úspěšná', 
        timestamp: new Date().toISOString(),
        count: updates.length 
    });

  } catch (err) {
    console.error('CMC Sync Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
