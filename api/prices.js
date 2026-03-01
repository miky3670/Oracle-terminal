// api/prices.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Rozšířeno na 8 symbolů: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, LTC
    const binSymbols = '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT"]';
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${binSymbols}`);
    
    if (!response.ok) throw new Error("Binance API down");
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
