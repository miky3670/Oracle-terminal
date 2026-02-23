export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const targets = [
    // PI - Taháme on-chain data (fixní objem 50M pro test stability)
    { name: 'PI_CHAIN', url: 'https://api.bitget.com/api/v2/spot/market/tickers?symbol=PIUSDT', parse: d => ({ p: d?.data?.[0]?.lastPr, c: d?.data?.[0]?.priceChangePercent, v: 52000000 }) },
    
    // M - Bitget MUSDT
    { name: 'BITGET_M', url: 'https://api.bitget.com/api/v2/spot/market/tickers?symbol=MUSDT', parse: d => ({ p: d?.data?.[0]?.lastPr, c: d?.data?.[0]?.priceChangePercent, v: d?.data?.[0]?.quoteVolume }) }
  ];
  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        const response = await fetch(t.url, { headers: { 'User-Agent': userAgent } });
        const data = await response.json();
        const vals = t.parse(data);
        return { id: t.name, price: vals.p ? parseFloat(vals.p) : 0, change24h: vals.c ? parseFloat(vals.c) : 0, vol24h: vals.v ? parseFloat(vals.v) : 0 };
      } catch { return { id: t.name, price: 0, change24h: 0, vol24h: 0 }; }
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (e) { res.status(500).json({ error: 'Bridge Error' }); }
}
