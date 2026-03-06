
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Teď už kompletní osmička: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, LTC
    const binSymbols = '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT"]';
    const binUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${binSymbols}`;

    const response = await fetch(binUrl);

    if (!response.ok) {
      throw new Error(`Binance error: ${response.status}`);
    }

    const data = await response.json();

    // Mapování dat s vynulovaným objemem
    const results = data.map(item => ({
      symbol: item.symbol.replace('USDT', ''),
      price: parseFloat(item.lastPrice),
      change24h: parseFloat(item.priceChangePercent),
      // TADY JE TEN ŘEZ: Vynucená nula pro globální objem
      vol24h: 0 
    }));

    res.status(200).json(results);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
