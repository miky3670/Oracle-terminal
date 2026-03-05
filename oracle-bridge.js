import crypto from 'crypto';

export default async function handler(req, res) {
  const CMC_KEY = 'e25571553e8045ad8007e6b1ce9048f8';
  
  // Seznam všech aktiv s jejich CMC ID
  const targets = [
    { id: 'BTC', cmcId: 1 },
    { id: 'ETH', cmcId: 1027 },
    { id: 'SOL', cmcId: 5426 },
    { id: 'BNB', cmcId: 1839 },
    { id: 'XRP', cmcId: 52 },
    { id: 'ADA', cmcId: 2010 },
    { id: 'DOGE', cmcId: 74 },
    { id: 'LTC', cmcId: 2 },
    { id: 'PI', cmcId: 13781 },
    { id: 'M', cmcId: 33732 } // MemeCore
  ];

  const createRSASignature = (data) => {
    try {
      const privateKey = process.env.RSA_PRIVATE_KEY;
      if (!privateKey) return null;
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(data));
      sign.end();
      return sign.sign(privateKey, 'base64');
    } catch (err) { return null; }
  };

  try {
    const idList = targets.map(t => t.cmcId).join(',');
    const cmcRes = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${idList}`, {
      headers: { 'X-CMC_PRO_API_KEY': CMC_KEY, 'Accept': 'application/json' }
    });
    
    const cmcData = await cmcRes.json();

    // Kontrola, zda CMC vrátil data v pořádku
    if (!cmcData.data) {
        throw new Error(cmcData.status?.error_message || "CMC Data missing");
    }

    const results = targets.map(t => {
      const asset = cmcData.data[t.cmcId];
      if (asset && asset.quote && asset.quote.USD) {
        const info = asset.quote.USD;
        return {
          id: t.id,
          price: parseFloat(info.price),
          change24h: parseFloat(info.percent_change_24h),
          vol24h: parseFloat(info.volume_24h)
        };
      }
      return { id: t.id, price: 0, change24h: 0, vol24h: 0 };
    });

    const signature = createRSASignature(results);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (signature) { res.setHeader('x-oracle-signature', signature); }

    res.status(200).json(results);
  } catch (e) {
    console.error("CMC Bridge Error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
