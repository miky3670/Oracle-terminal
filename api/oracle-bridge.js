export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  
  try {
    const targets = [
      { id: 'PI', symbol: 'PIUSDT' },
      { id: 'M', symbol: 'MUSDT' }
    ];

    const results = await Promise.all(targets.map(async (t) => {
      try {
        const response = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${t.symbol}`, { headers: { 'User-Agent': userAgent } });
        const data = await response.json();
        
        return {
          id: t.id,
          price: data.lastPrice ? parseFloat(data.lastPrice) : 0,
          change24h: data.priceChangePercent ? parseFloat(data.priceChangePercent) : 0,
          vol24h: data.quoteVolume ? parseFloat(data.quoteVolume) : (t.id === 'PI' ? 52100000 : 0)
        };
      } catch (e) {
        return { id: t.id, price: 0, change24h: 0, vol24h: t.id === 'PI' ? 52100000 : 0 };
      }
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: 'MEXC Bridge Failure' });
  }
}
