const marketTableBody = document.querySelector('#market-table tbody');
const cashEl = document.getElementById('cash');
const totalEl = document.getElementById('total-value');
const holdingsEl = document.getElementById('holdings');
const logEl = document.getElementById('log');
const ctx = document.getElementById('priceChart').getContext('2d');

const market = {
  AAPL: { price: 310000, vol: 0.01, history: [], prevPrice: 310000 },
  TSLA: { price: 445000, vol: 0.03, history: [], prevPrice: 445000 },
  GOOG: { price: 272000, vol: 0.015, history: [], prevPrice: 272000 },
  AMZN: { price: 300000, vol: 0.02, history: [], prevPrice: 300000 },
  삼성전자: { price: 70000, vol: 0.015, history: [], prevPrice: 70000 },
  LG화학: { price: 276000, vol: 0.02, history: [], prevPrice: 276000 },
  현대차: { price: 180000, vol: 0.025, history: [], prevPrice: 180000 },
  카카오: { price: 120000, vol: 0.02, history: [], prevPrice: 120000 },
  MSFT: { price: 200000, vol: 0.01, history: [], prevPrice: 200000 },
  NFLX: { price: 150000, vol: 0.025, history: [], prevPrice: 150000 },
  FB: { price: 180000, vol: 0.02, history: [], prevPrice: 180000 },
  NVDA: { price: 250000, vol: 0.03, history: [], prevPrice: 250000 }
};

const portfolio = {
  cash: 1000000000,
  holdings: {},
  buyAvgPrices: {}
};

let selectedSymbol = 'AAPL';
const qtyInputs = {};

function rndGauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function addHistory(sym, price) {
  const s = market[sym];
  const now = Date.now();

  let prev = s.history.length ? s.history[s.history.length - 1] : null;

  let o = prev ? Math.round(prev.c) : Math.round(price);
  let c = Math.round(price);
  let h = Math.max(o, c) + Math.floor(Math.random() * 2);
  let l = Math.min(o, c) - Math.floor(Math.random() * 2);

  h = Math.max(h, o, c);
  l = Math.min(l, o, c);

  s.history.push({ x: now, o, h, l, c });

  if (s.history.length > 30) s.history.shift();
}

function stepMarket() {
  for (const sym in market) {
    const s = market[sym];
    const change = rndGauss() * s.vol * s.price;
    s.prevPrice = s.price;
    s.price = Math.max(1, Math.round(s.price + change));

    addHistory(sym, s.price);
  }
  render();
  updateChart();
}

function render() {
  marketTableBody.innerHTML = '';
  for (const sym in market) {
    const s = market[sym];
    const diff = s.price - s.prevPrice;
    const diffPercent = ((diff) / s.prevPrice) * 100;

    let colorClass = '';
    if (diff > 0) colorClass = 'price-up';
    else if (diff < 0) colorClass = 'price-down';

    const diffPercentStr = diffPercent.toFixed(0) + '%';

    const prices = s.history.map(h => h.c);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const buyKey = sym + '-buy';
    const sellKey = sym + '-sell';
    const buyQty = qtyInputs[buyKey] !== undefined ? qtyInputs[buyKey] : 1;
    const sellQty = qtyInputs[sellKey] !== undefined ? qtyInputs[sellKey] : 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="cursor:pointer; font-weight:${selectedSymbol === sym ? '700' : '400'}">
        ${sym} <span class="${colorClass}">(${diffPercentStr})</span><br/>
        <small style="color:#666;">최저 ${minPrice.toLocaleString()}원 / 최고 ${maxPrice.toLocaleString()}원</small>
      </td>
      <td class="${colorClass}">${s.price.toLocaleString()}원</td>
      <td>${s.vol.toFixed(4)}</td>
      <td>
        <input type="number" min="1" value="${buyQty}" class="qty-input buy-qty" style="width:50px; margin-right:5px;" />
        <button class="buy-btn" data-sym="${sym}" style="background:#f44336; color:#fff; border:none; padding:3px 7px; cursor:pointer;">매수</button>
      </td>
      <td>
        <input type="number" min="1" value="${sellQty}" class="qty-input sell-qty" style="width:50px; margin-right:5px;" />
        <button class="sell-btn" data-sym="${sym}" style="padding:3px 7px; cursor:pointer;">매도</button>
      </td>
    `;
    marketTableBody.appendChild(tr);

    tr.querySelector('td:first-child').onclick = () => {
      selectedSymbol = sym;
      render();
      updateChart();
    };

    tr.querySelector('.buy-qty').addEventListener('input', e => {
      const val = Math.max(1, parseInt(e.target.value) || 1);
      e.target.value = val;
      qtyInputs[buyKey] = val;
    });
    tr.querySelector('.sell-qty').addEventListener('input', e => {
      const val = Math.max(1, parseInt(e.target.value) || 1);
      e.target.value = val;
      qtyInputs[sellKey] = val;
    });
  }

  cashEl.textContent = `현금: ${portfolio.cash.toLocaleString()}원`;

  let total = portfolio.cash;
  holdingsEl.innerHTML = '';

  let totalProfit = 0;

  for (const sym in portfolio.holdings) {
    const qty = portfolio.holdings[sym];
    const currentPrice = market[sym]?.price || 0;
    const val = currentPrice * qty;
    total += val;

    const buyAvg = portfolio.buyAvgPrices[sym] || 0;
    const cost = buyAvg * qty;

    const profit = val - cost;
    totalProfit += profit;

    const profitPercent = cost ? (profit / cost) * 100 : 0;

    const profitClass = profit > 0 ? 'price-up' : (profit < 0 ? 'price-down' : '');

    const li = document.createElement('li');
    li.innerHTML = `${sym}: ${qty.toLocaleString()}주 (평가액 ${val.toLocaleString()}원, 수익 ${profit.toLocaleString()}원, 수익률 ${profitPercent.toFixed(0)}%)`;
    li.className = profitClass;
    holdingsEl.appendChild(li);
  }

  totalEl.textContent = `총 가치: ${total.toLocaleString()}원`;

  let profitColorClass = '';
  if (totalProfit > 0) profitColorClass = 'price-up';
  else if (totalProfit < 0) profitColorClass = 'price-down';

  let totalProfitEl = document.getElementById('total-profit');
  if (!totalProfitEl) {
    totalProfitEl = document.createElement('div');
    totalProfitEl.id = 'total-profit';
    totalEl.parentNode.insertBefore(totalProfitEl, totalEl.nextSibling);
  }
  totalProfitEl.innerHTML = `종합 수익금액: <span class="${profitColorClass}">${totalProfit.toLocaleString()}원</span>`;

  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.onclick = () => {
      const sym = btn.dataset.sym;
      const qtyKey = sym + '-buy';
      const qty = qtyInputs[qtyKey] || 1;
      if (confirm(`${sym} ${qty}주를 매수하시겠습니까?`)) {
        trade('buy', sym, qty);
      }
    };
  });
  document.querySelectorAll('.sell-btn').forEach(btn => {
    btn.onclick = () => {
      const sym = btn.dataset.sym;
      const qtyKey = sym + '-sell';
      const qty = qtyInputs[qtyKey] || 1;
      if (confirm(`${sym} ${qty}주를 매도하시겠습니까?`)) {
        trade('sell', sym, qty);
      }
    };
  });
}

function appendLog(text) {
  const p = document.createElement('div');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logEl.prepend(p);
}

function trade(action, sym, qty) {
  qty = Math.max(1, parseInt(qty) || 1);
  const price = market[sym].price;
  if (action === 'buy') {
    const cost = price * qty;
    if (cost > portfolio.cash) {
      appendLog('잔고 부족');
      alert('잔고가 부족합니다.');
      return;
    }
    portfolio.cash -= cost;
    portfolio.holdings[sym] = (portfolio.holdings[sym] || 0) + qty;

    const prevQty = portfolio.holdings[sym] - qty;
    const prevAvg = portfolio.buyAvgPrices[sym] || 0;
    portfolio.buyAvgPrices[sym] = ((prevAvg * prevQty) + cost) / (prevQty + qty);

    appendLog(`BUY ${sym} ${qty}주 @ ${price.toLocaleString()}원`);
  } else if (action === 'sell') {
    const have = portfolio.holdings[sym] || 0;
    if (qty > have) {
      appendLog('보유 수량 부족');
      alert('보유 수량이 부족합니다.');
      return;
    }
    portfolio.holdings[sym] -= qty;
    if (portfolio.holdings[sym] === 0) {
      delete portfolio.holdings[sym];
      delete portfolio.buyAvgPrices[sym];
    }
    portfolio.cash += price * qty;
    appendLog(`SELL ${sym} ${qty}주 @ ${price.toLocaleString()}원`);
  }
  render();
}

let priceChart = null;

function createChart() {
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: market[selectedSymbol].history.map(h => new Date(h.x).toLocaleTimeString()),
      datasets: [{
        label: `${selectedSymbol} 가격`,
        data: market[selectedSymbol].history.map(h => Math.round(h.c)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          display: false,
          title: { display: false, text: '시간' }
        },
        y: {
          display: true,
          title: { display: false, text: '가격' },
          beginAtZero: false,
          ticks: {
            font: {
                size : 5
            }
          }
        }
      }
    }
  });
}

function updateChart() {
  if (!priceChart) {
    createChart();
  } else {
    priceChart.data.labels = market[selectedSymbol].history.map(h => new Date(h.x).toLocaleTimeString());
    priceChart.data.datasets[0].label = `${selectedSymbol} 가격`;
    priceChart.data.datasets[0].data = market[selectedSymbol].history.map(h => Math.round(h.c));
    priceChart.update();
  }
}

// 초기 데이터 생성
for (const sym in market) {
  const s = market[sym];
  for (let i = 0; i < 30; i++) {
    addHistory(sym, s.price);
  }
}

setInterval(stepMarket, 3000);
render();