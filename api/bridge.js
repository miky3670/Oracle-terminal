import crypto from 'crypto';

export default async function handler(req, res) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const targets = [{ id: 'PI', s: 'PIUSDT' }, { id: 'M', s: 'MUSDT' }];

  // Funkce pro vytvoření RSA podpisu (privátní klíč bere z Environment Variables na Vercelu)
  const createRSASignature = (data) => {
    try {
      const privateKey = process.env.RSA_PRIVATE_KEY;
      if (!privateKey) return null;
      
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(data));
      sign.end();
      return sign.sign(privateKey, 'base64');
    } catch (err) {
      console.error('RSA Signing Error:', err);
      return null;
    }
  };

  try {
    const results = await Promise.all(targets.map(async (t) => {
      try {
        const r = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${t.s}`, { headers: { 'User-Agent': userAgent } });
        const d = await r.json();
        // Bereme čistá data z MEXC, pokud nejsou, vracíme 0 (žádné fallbacky)
        return {
          id: t.id,
          price: d.lastPrice ? parseFloat(d.lastPrice) : 0,
          change24h: d.priceChangePercent ? parseFloat(d.priceChangePercent) : 0,
          vol24h: d.quoteVolume ? parseFloat(d.quoteVolume) : 0
        };
      } catch (e) { return { id: t.id, price: 0, change24h: 0, vol24h: 0 }; }
    }));

    // Vytvoření podpisu pro aktuální výsledky
    const signature = createRSASignature(results);

    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Přidáme podpis do hlavičky odpovědi, aby ho Supabase (nebo kdokoli další) mohl ověřit
    if (signature) {
      res.setHeader('x-oracle-signature', signature);
    }

    res.status(200).json(results);
  } catch (e) { res.status(500).json({ error: 'MEXC Bridge Error' }); }
}
