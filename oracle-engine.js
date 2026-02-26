/**
 * ORACLE ENGINE v1.0
 * Externí mozek pro odlehčení index.html
 */

window.startOracleEngine = function() {
    console.log("Oracle Engine: Startuji...");
    initEngineUI();
    updateData();
    setInterval(updateData, 3000);
};

// --- DATA & STAV ---
const assets = ['BTC', 'ETH', 'M', 'PI'];
let activeTrades = JSON.parse(localStorage.getItem('oracle_trades')) || {};
let tradeHistory = JSON.parse(localStorage.getItem('oracle_history')) || [];
let bank = parseFloat(localStorage.getItem('oracle_bank')) || 10000.00;
let stake = parseFloat(localStorage.getItem('oracle_stake')) || 250.00;
let autoSettings = JSON.parse(localStorage.getItem('oracle_auto')) || { 
    slEn: false, slVal: 2.5, slUnit: '%', tpEn: false, tpVal: 5.0, tpUnit: '%', 
    tpDyn: false, learning: true, autopilot: false, allowedAssets: ['BTC', 'ETH', 'M', 'PI'] 
};

// --- UI LOGIKA ---
function initEngineUI() {
    const container = document.getElementById('engine-container');
    if(!container) return;

    container.innerHTML = `
        <div class="auto-box">
            <div class="auto-row">
                <span>MOTOR OBCHODOVÁNÍ:</span>
                <button id="auto-btn" class="unit-btn" onclick="toggleAutopilot()" style="width:100px;">VYPNUTO</button>
            </div>
            <div id="asset-selectors" class="asset-checks"></div>
            <div class="auto-row" style="margin-top:10px; border-top: 1px solid #222; padding-top:10px;">
                <span>STOP LOSS:</span>
                <div>
                    <button id="sl-unit" class="unit-btn" onclick="toggleUnit('sl')">%</button>
                    <input type="checkbox" id="sl-enable" onchange="syncAuto()">
                    <input type="number" id="sl-value" class="bank-input" value="2.5">
                </div>
            </div>
            <div class="auto-row">
                <span>TAKE PROFIT:</span>
                <div>
                    <button id="tp-dyn-btn" class="unit-btn" onclick="toggleDyn()">DYN</button>
                    <button id="tp-unit" class="unit-btn" onclick="toggleUnit('tp')">%</button>
                    <input type="checkbox" id="tp-enable" onchange="syncAuto()">
                    <input type="number" id="tp-value" class="bank-input" value="5.0">
                </div>
            </div>
        </div>
        <div id="history-list-engine" style="margin-top:20px;"></div>
    `;
    renderAssetChecks();
    refreshModalValues();
}

function renderAssetChecks() {
    const el = document.getElementById('asset-selectors');
    if(!el) return;
    el.innerHTML = assets.map(a => `
        <div class="asset-check-item">
            <input type="checkbox" id="check-${a}" ${autoSettings.allowedAssets.includes(a)?'checked':''} onchange="syncAuto()">
            <label>${a}</label>
        </div>`).join('');
}

window.toggleAutopilot = function() { autoSettings.autopilot = !autoSettings.autopilot; saveAndRefresh(); };
window.toggleLearning = function() { autoSettings.learning = !autoSettings.learning; saveAndRefresh(); };
window.toggleDyn = function() { autoSettings.tpDyn = !autoSettings.tpDyn; saveAndRefresh(); };
window.toggleUnit = function(t) { 
    if(t==='sl') autoSettings.slUnit = autoSettings.slUnit==='%'?'USDT':'%';
    else autoSettings.tpUnit = autoSettings.tpUnit==='%'?'USDT':'%';
    saveAndRefresh();
};

function saveAndRefresh() {
    localStorage.setItem('oracle_auto', JSON.stringify(autoSettings));
    refreshModalValues();
}

function refreshModalValues() {
    const dot = document.getElementById('motor-status');
    const btn = document.getElementById('auto-btn');
    if(dot) dot.className = autoSettings.autopilot ? "motor-dot dot-active" : "motor-dot dot-off";
    if(btn) btn.innerText = autoSettings.autopilot ? "ZAPNUTO" : "VYPNUTO";
}

// --- DATA FETCH & ENGINE ---
async function updateData() {
    try {
        const [resB, resBridge, hRes, sRes] = await Promise.all([
            fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=[%22BTCUSDT%22,%22ETHUSDT%22]").then(r=>r.json()),
            fetch("/api/oracle-bridge").then(r=>r.json()),
            fetch("https://zrbqhhnxshrayctqmncy.supabase.co/rest/v1/oracle_hype?select=*", { headers: {'apikey': '...', 'Authorization': 'Bearer ...'} }).then(r=>r.json()),
            fetch("https://zrbqhhnxshrayctqmncy.supabase.co/rest/v1/oracle_signals?select=*&timeframe=eq.15M", { headers: {'apikey': '...', 'Authorization': 'Bearer ...'} }).then(r=>r.json())
        ]);
        
        // Logika pro výpočet a vykreslení karet... (zkráceno pro ukázku, v souboru bude plná)
        renderCards(resB, resBridge, hRes, sRes);
    } catch(e) { console.error("Engine Data Error", e); }
}

function renderCards(binance, bridge, hypes, signals) {
    // Tady proběhne kompletní vykreslení mřížky do elementu 'grid'
}
