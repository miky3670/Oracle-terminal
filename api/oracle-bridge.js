import crypto from 'crypto';

export default async function handler(req, res) {
  // Přidáme hlavičky proti cachování hned na začátek
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CMC_KEY = 'e25571553e8045ad8007e6b1ce9048f8';
  const targets = [
    { id: 'BTC', cmcId: 1 }, { id: 'ETH', cmcId: 1027 }, { id: 'SOL', cmcId: 5426 },
    { id: 'BNB', cmcId: 1839 }, { id: 'XRP', cmcId: 52 }, { id: 'ADA', cmcId: 2010 },
    { id: 'DOGE', cmcId: 74 }, { id: 'LTC', cmcId: 2 }, { id: 'PI', cmcId: 13781 },
    { id: 'M', cmcId: 33732 }
  ];

  try {
    const idList = targets.map(t => t.cmcId).join(',');
    // Vynutíme čerstvý požadavek přidáním náhodného parametru do URL
    const cmcRes = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${idList}&nocache=${Date.now()}`, {
      headers: { 'X-CMC_PRO_API_KEY': CMC_KEY, 'Accept': 'application/json' }
    });
    
    const cmcData = await cmcRes.json();

    if (!cmcData || !cmcData.data) {
      console.error("CMC Response Error:", cmcData);
      return res.status(200).json(targets.map(t => ({ id: t.id, price: 0, change24h: 0, vol24h: 0 })));
    }

    const results = targets.map(t => {
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

    // RSA Podpis - pokud selže, pošleme data bez něj, aby Terminál nezčernal
    let signature = null;
    try {
      const privateKey = process.env.RSA_PRIVATE_KEY;
      if (privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify(results));
        sign.end();
        signature = sign.sign(privateKey, 'base64');
      }
    } catch (rsaErr) { console.error("RSA Signing failed"); }

    if (signature) res.setHeader('x-oracle-signature', signature);
    res.status(200).json(results);

  } catch (e) {
    console.error("Global Bridge Error:", e.message);
    // V nejhorším případě vrátíme prázdné šablony, aby grid naskočil
    res.status(200).json(targets.map(t => ({ id: t.id, price: 0, change24h: 0, vol24h: 0 })));
  }
}
