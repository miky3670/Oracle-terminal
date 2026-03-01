export default async function handler(req, res) {
  // Povolíme přístup z tvé domény (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Seznam 8 mincí: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, LTC
    const binSymbols = '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT"]';
    const binUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${binSymbols}`;
    
    const response = await fetch(binUrl);
    
    if (!response.ok) {
      throw new Error(`Binance error: ${response.status}`);
    }
    
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ error: 'Bridge failure', details: error.message });
  }
}
