
// ORACLE BRIDGE v2.1 (OPERACE ČISTÝ ŘEZ - VOLUME ZERO)
export default async function (req, res) {
  const targets = [
    { id: 'PI', s: 'PIUSDT' },
    { id: 'M', s: 'MUSDT' }
  ];

  try {
    const results = await Promise.all(targets.map(async (t) => {
      const response = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${t.s}`);
      const data = await response.json();
      
      // Mapování se sjednoceným vynulovaným objemem
      return {
        id: t.id,
        price: data.lastPrice ? parseFloat(data.lastPrice) : 0,
        change24h: data.priceChangePercent ? parseFloat(data.priceChangePercent) : 0,
        // TADY JE TEN ŘEZ: Místo data.quoteVolume dáváme 0
        vol24h: 0 
      };
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(results));
  } catch (e) {
    res.status(500).send([]);
  }
}
