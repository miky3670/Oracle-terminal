export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  const targets = [
    { name: 'BITGET_PI', url: 'https://api.bitget.com/api/v2/spot/market/tickers?symbol=PIUSDT', parse: d => d?.data?.[0]?.lastPr },
    { name: 'OKX_PI', url: 'https://www.okx.com/api/v5/market/ticker?instId=PI-USDT', parse: d => d?.data?.[0]?.last },
    { name: 'MEXC_PI', url: 'https://api.mexc.com/api/v3/ticker/price?symbol=PIUSDT', parse: d => d?.price },
    { name: 'BITGET_M', url: 'https://api.bitget.com/api/v2/spot/market/tickers?symbol=MCOREUSDT', parse: d => d?.data?.[0]?.lastPr }
  ];

  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        const response = await fetch(t.url, { headers: { 'User-Agent': userAgent } });
        const data = await response.json();
        const price = t.parse(data);
        return { id: t.name, price: price ? parseFloat(price) : null };
      } catch { return { id: t.name, price: null }; }
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: 'Bridge Error' });
  }
}
