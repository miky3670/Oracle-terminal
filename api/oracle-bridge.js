import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  const CMC_KEY = 'e25571553e8045ad8007e6b1ce9048f8';
  const targets = [
    { id: 'BTC', cmcId: 1 }, { id: 'ETH', cmcId: 1027 }, { id: 'SOL', cmcId: 5426 },
    { id: 'BNB', cmcId: 1839 }, { id: 'XRP', cmcId: 52 }, { id: 'ADA', cmcId: 2010 },
    { id: 'DOGE', cmcId: 74 }, { id: 'LTC', cmcId: 2 }, { id: 'PI', cmcId: 13781 },
    { id: 'M', cmcId: 33732 }
  ];

  try {
    const idList = targets.map(t => t.cmcId).join(',');
    // Používáme v2 endpoint, který je pro CMC nejstabilnější
    const response = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${idList}`, {
      headers: { 'X-CMC_PRO_API_KEY': CMC_KEY, 'Accept': 'application/json' }
    });
    
    const cmcData = await response.json();

    if (!cmcData.data) {
        console.error("CMC API No Data:", cmcData.status?.error_message);
        return res.status(200).json(targets.map(t => ({ id: t.id, price: 0, change24h: 0, vol24h: 0 })));
    }

    const results = targets.map(t => {
      // DŮLEŽITÉ: V2 vrací data jako objekt, kde klíčem je ID mince
      const asset = cmcData.data[t.cmcId];
      if (asset && asset.quote && asset.quote.USD) {
        const info = asset.quote.USD;
        return {
          id: t.id,
          price: parseFloat(info.price) || 0,
          change24h: parseFloat(info.percent_change_24h) || 0,
          vol24h: parseFloat(info.volume_24h) || 0
        };
      }
      return { id: t.id, price: 0, change24h: 0, vol24h: 0 };
    });

    // Podpis pro Supabase (pokud máš nastaven RSA klíč ve Vercelu)
    try {
      const privateKey = process.env.RSA_PRIVATE_KEY;
      if (privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify(results));
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        res.setHeader('x-oracle-signature', signature);
      }
    } catch (e) {}

    res.status(200).json(results);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
