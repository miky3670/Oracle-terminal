import { createClient } from '@supabase/supabase-js';

// TADY JE TA ZMĚNA: Kód si klíče vezme z nastavení Vercelu (Environment Variables)
const supabase = createClient(
  process.env.SUPABASE_URL || "https://zrbqhhnxshrayctqmncy.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "TU_VLOZ_TEN_NOVY_KLIC_POKUD_HO_NEMAS_VE_VERCELU"
);

export default async function handler(req, res) {
  // CMC klíč si taky můžeš dát do Vercelu jako CMC_API_KEY, nebo ho nechat takto:
  const CMC_API_KEY = process.env.CMC_API_KEY || 'e2557155-3e80-45ad-8007-e6b1ce9048f8';
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
      const errTxt = await response.text();
      throw new Error(`CMC Error: ${response.status} - ${errTxt}`);
    }

    const data = await response.json();
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

    // Zápis do Supabase - teď s novým klíčem
    const { error: sbError } = await supabase.from('oracle_volumes').upsert(updates);

    if (sbError) throw new Error(`Supabase Error: ${sbError.message}`);

    res.status(200).json({ success: true, message: "Miliardy natekly do Supabase!", count: updates.length });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
