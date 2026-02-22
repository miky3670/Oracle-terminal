export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  const targets = [
    // PI - Taháme přímo globální data (pokud to tvůj endpoint umí), jinak agregát burz
    { 
      name: 'CHAIN_PI', 
      url: 'https://api.coingecko.com/api/v3/coins/pi-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false', 
      parse: d => ({
        p: d?.market_data?.current_price?.usd,
        c: d?.market_data?.price_change_percentage_24h,
        v: d?.market_data?.total_volume?.usd // Tady naskočí těch 50M+ globálně
      })
    },
    // M - Taháme z Bitgetu (než napojíme tvůj RPC uzel napřímo)
    { 
      name: 'BITGET_M', 
      url: 'https://api.bitget.com/api/v2/spot/market/tickers?symbol=MUSDT', 
      parse: d => ({
        p: d?.data?.[0]?.lastPr,
        c: d?.data?.[0]?.priceChangePercent,
        v: d?.data?.[0]?.quoteVolume
      })
    }
  ];

  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        const response = await fetch(t.url, { headers: { 'User-Agent': userAgent } });
        const data = await response.json();
        const vals = t.parse(data);
        return { 
            id: t.name, 
            price: vals.p || 0, 
            change24h: vals.c || 0, 
            vol24h: vals.v || 0 
        };
      } catch { return { id: t.name, price: 0, change24h: 0, vol24h: 0 }; }
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: 'Bridge Error' });
  }
}
