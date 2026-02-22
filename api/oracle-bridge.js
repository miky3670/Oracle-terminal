export default async function handler(req, res) {
  const SB_URL = "https://zrbqhhnxshrayctqmncy.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnFoaG54c2hyYXljdHFtbmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE2MjcsImV4cCI6MjA4NzI1NzYyN30.7JA6rGog3TphPqdb3tbHz4D03haXSFWZOXwi2yK_uek";

  try {
    // 1. Získáme on-chain data (cenu a objem), která už máš v databázi pro Core Pulse
    const response = await fetch(`${SB_URL}/rest/v1/oracle_signals?select=symbol,price,change_24h,volume_24h&symbol=eq.PI`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    const data = await response.json();
    const pi = data[0] || {};

    // 2. Pro M (MemeCore) zatím necháme tvůj funkční Bitget MUSDT
    const resM = await fetch("https://api.bitget.com/api/v2/spot/market/tickers?symbol=MUSDT");
    const jsonM = await resM.json();
    const m = jsonM.data[0] || {};

    const results = [
      { id: 'PI', price: pi.price || 0, change24h: pi.change_24h || 0, vol24h: pi.volume_24h || 50000000 },
      { id: 'M', price: parseFloat(m.lastPr) || 0, change24h: parseFloat(m.priceChangePercent) || 0, vol24h: parseFloat(m.quoteVolume) || 0 }
    ];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: 'Bridge Error' });
  }
}
