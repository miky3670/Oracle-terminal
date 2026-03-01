export default async function handler(req, res) {
  try {
    // Seznam mincí, které chceme z Binance
    const binSymbols = '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT"]';
    const binUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${binSymbols}`;
    
    // Server Vercelu si zavolá Binance (Binance vidí IP adresu Vercelu, ne tvoji)
    const response = await fetch(binUrl);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Pošleme data zpět do tvého mobilu/PC
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
    
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Nepodařilo se načíst ceny z Binance', details: error.message });
  }
}
