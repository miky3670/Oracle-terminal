export default async function handler(req, res) {
  // Odstraněn problematický import crypto, který způsoboval pád na Vercelu
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const targets = [{ id: 'PI', s: 'PIUSDT' }, { id: 'M', s: 'MUSDT' }];

  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        const r = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${t.s}`, { 
          headers: { 'User-Agent': userAgent } 
        });
        
        if (!r.ok) throw new Error(`MEXC status ${r.status}`);
        
        const d = await r.json();
        
        // Mapování dat přímo pro tvůj Index
        return {
          id: t.id,
          symbol: t.id,
          price: d.lastPrice ? parseFloat(d.lastPrice) : 0,
          change24h: d.priceChangePercent ? parseFloat(d.priceChangePercent) : 0,
          vol24h: d.quoteVolume ? parseFloat(d.quoteVolume) : 0
        };
      } catch (e) { 
        return { id: t.id, symbol: t.id, price: 0, change24h: 0, vol24h: 0 }; 
      }
    }));

    // Nastavení hlaviček pro CORS, aby to Terminál mohl přečíst
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, max-age=0'); // Vynutíme čerstvá data

    res.status(200).json(results);
  } catch (e) { 
    res.status(500).json({ error: 'Bridge Internal Error' }); 
  }
}

 
