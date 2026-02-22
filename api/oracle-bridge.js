export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const targets = [
    // PI - Přímo z HTX (Huobi), tam je tvůj 50M+ objem a reálný trend
    { name: 'HTX_PI', url: 'https://api.huobi.pro/market/detail/merged?symbol=piusdt', parse: d => ({ p: d?.tick?.close, c: ((d?.tick?.close - d?.tick?.open)/d?.tick?.open*100), v: d?.tick?.vol }) },
    // M - Bitget s tvou opravou na MUSDT
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
