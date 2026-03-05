
import crypto from 'crypto';

export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const targets = [{ id: 'PI', s: 'PIUSDT' }, { id: 'M', s: 'MUSDT' }];

  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        // Dotaz na burzu MEXC pro reálná data
        const r = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${t.s}`, { 
          headers: { 'User-Agent': userAgent } 
        });
        const d = await r.json();
        
        // Pokud MEXC vrátí cenu, použijeme ji. Pokud ne, vracíme 0.
        return {
          id: t.id,
          symbol: t.id, // Přidáno pro lepší kompatibilitu s Indexem
          price: d.lastPrice ? parseFloat(d.lastPrice) : 0,
          change24h: d.priceChangePercent ? parseFloat(d.priceChangePercent) : 0,
          vol24h: d.quoteVolume ? parseFloat(d.quoteVolume) : 0
        };
      } catch (e) { 
        console.error(`Error fetching ${t.id}:`, e);
        return { id: t.id, symbol: t.id, price: 0, change24h: 0, vol24h: 0 }; 
      }
    }));

    // Nastavení hlaviček pro prohlížeč
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

    // Odeslání čistých dat bez nutnosti RSA podpisu
    res.status(200).json(results);
  } catch (e) { 
    console.error('MEXC Bridge Global Error:', e);
    res.status(500).json({ error: 'MEXC Bridge Error' }); 
  }
}
