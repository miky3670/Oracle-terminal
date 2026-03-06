const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://zrbqhhnxshrayctqmncy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE2MjcsImV4cCI6MjA4NzI1NzYyN30.7JA6rGog3TphPqdb3tbHz4D03haXSFWZOXwi2yK_uek"
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const CMC_API_KEY = 'e2557155-3e80-45ad-8007-e6b1ce9048f8';
  const symbols = 'BTC,ETH,SOL,BNB,XRP,ADA,DOGE,LTC,PI,M';

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
      {
        headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY, 'Accept': 'application/json' }
      }
    );

    const data = await response.json();
    const updates = [];
    
    symbols.split(',').forEach(sym => {
      if (data.data && data.data[sym]) {
        updates.push({
          symbol: sym,
          volume_24h: parseFloat(data.data[sym].quote.USD.volume_24h || 0),
          last_update: new Date().toISOString()
        });
      }
    });

    const { error: sbError } = await supabase.from('oracle_volumes').upsert(updates);
    if (sbError) throw new Error(sbError.message);

    res.status(200).json({ success: true, message: "MILIARDY JSOU DOMA!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
