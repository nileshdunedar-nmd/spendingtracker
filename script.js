// ✅ Global state
let transactions = [];
let monthlyBudget = 0;
let dailyExpenseChart = null;
let monthlyExpenseChart = null;
let budgetMessages = [];
let currentMessageIndex = 0;
let budgetMessageInterval = null;

// ✅ 1. Global variables (TOP PE add karo)
let categoryBudgets = {
    food: 0, groceries: 0, transport: 0, clothing: 0, 
    debt: 0, savings: 0, shopping: 0, utilities: 0,
    health: 0, travel: 0, housing: 0, entertainment: 0, 
    education: 0, other: 0
};

const expenseCategories = [
    'food','groceries','transport','clothing','debt', 'savings','shopping',
    'utilities','health','travel','housing','entertainment','education','other'
];

const incomeCategories = [
    'salary','freelance','investment','business','bonus','refund','gift','other'
];

function getCategoryEmoji(category) {
    const emojis = {
            food:'🍔', groceries:'🛒', transport:'🚗', clothing:'👕',
    debt:'💳', savings:'💰', shopping:'🛍️', utilities:'💡', health:'🏥',
    travel:'✈️', housing:'🏠', entertainment:'🎬', education:'📚',
    other:'📦',

    salary:'💼', freelance:'💻', investment:'📈', business:'🏢',
    bonus:'🎁', refund:'↩️', gift:'🎀'

    };
    return emojis[category] || '📌';
}

document.addEventListener('DOMContentLoaded', () => {

    /* ===============================
       1️⃣ BASIC INIT
    =============================== */
    currentType = 'expense';
    detectCurrencyAuto();
    updateCategoryOptions();        // initial category state
    loadFromLocalStorage();         // load all saved data
    setDefaultDate();
    updateDashboard();
    setFilterMonth();
    updateBudgetView?.();
    updateCategoryBudgetUI?.();
    updateCategoryOptions();
    initPinLock?.();
    // detectAndUpdateCurrency();

    /* ===============================
       2️⃣ MONTHLY CHART FILTER
    =============================== */
    const monthlyFilter = document.getElementById('monthlyCategoryFilter');
    if (monthlyFilter) {
        monthlyFilter.addEventListener('change', drawMonthlyExpenseChart);
    }


    /* ===============================
       3️⃣ CONFIRM DIALOG EVENTS
    =============================== */
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo  = document.getElementById('confirmNo');
    const confirmDialog = document.getElementById('confirmDialog');

    if (confirmYes && confirmNo && confirmDialog) {

        confirmYes.onclick = () => {
            confirmDialog.style.display = 'none';
            if (confirmResolve) confirmResolve(true);
        };

        confirmNo.onclick = () => {
            confirmDialog.style.display = 'none';
            if (confirmResolve) confirmResolve(false);
        };

        // ESC key support
        document.addEventListener('keydown', (e) => {
            if (
                e.key === 'Escape' &&
                confirmDialog.style.display === 'flex'
            ) {
                confirmNo.click();
            }
        });
    }


    /* ===============================
       4️⃣ SEARCH & FILTER LISTENERS
    =============================== */
    const searchInput = document.getElementById('transactionSearch');
    const monthFilter = document.getElementById('filterMonth');

    if (searchInput) {
        searchInput.addEventListener('input', filterTransactions);
    }

    if (monthFilter) {
        monthFilter.addEventListener('change', filterTransactions);
    }

    // Initial filter render
    filterTransactions();
});


/* ===============================
    SET & FORGET RESET PIN
    =============================== */
const PIN_KEY = "app_pin";
const SEC_Q = "sec_q";
const SEC_A = "sec_a";

function initPinLock() {
  const savedPin = localStorage.getItem(PIN_KEY);

  const lock = document.getElementById("pinLockScreen");
  const setup = document.getElementById("pinSetupArea");
  const login = document.getElementById("pinLoginArea");
  const subtitle = document.getElementById("pinSubtitle");

  if (!lock) return;

  lock.style.display = "flex";

  if (savedPin) {
    setup.classList.add("hidden");
    login.classList.remove("hidden");
    subtitle.textContent = "Enter your PIN to unlock";
  } else {
    setup.classList.remove("hidden");
    login.classList.add("hidden");
    subtitle.textContent = "Set a 4-digit PIN to protect your data";
  }
}

function setPin() {
  const pin = newPin.value.trim();
  const confirm = confirmPin.value.trim();
  const q = securityQuestion.value;
  const a = securityAnswer.value.trim().toLowerCase();

  if (!/^\d{4}$/.test(pin) || pin !== confirm) {
    showToast("Enter matching 4-digit PIN");
    return;
  }

  if (!q || !a) {
    showToast("Set security question");
    return;
  }

  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(SEC_Q, q);
  localStorage.setItem(SEC_A, a);

  showToast("PIN set successfully");
  initPinLock();
}

function verifyPin() {
  const savedPin = localStorage.getItem(PIN_KEY);
  const entered = loginPin.value.trim();

  if (entered !== savedPin) {
    showToast("Wrong PIN");
    return;
  }

  document.getElementById("pinLockScreen").style.display = "none";
  showToast("Unlocked");
}

function showForgotPin() {
  const q = localStorage.getItem(SEC_Q);
  if (!q) {
    showToast("No security question set");
    return;
  }

  const map = {
    pet: "Your first pet name?",
    city: "Your birth city?",
    school: "Your first school name?"
  };

  document.getElementById("selectedQuestion").innerText = map[q];
  pinLockScreen.style.display = "none";
  forgotPinScreen.classList.remove("hidden");
}

function verifySecurityAnswer() {
  const saved = localStorage.getItem(SEC_A);
  const input = forgotAnswer.value.trim().toLowerCase();

  if (input !== saved) {
    showToast("Wrong answer");
    return;
  }

  localStorage.removeItem(PIN_KEY);
  showToast("Verified! Set new PIN");
  location.reload();
}

function resetAllData() {
  customConfirm("Reset all data & PIN?").then(ok => {
    if (!ok) return;

    localStorage.clear();
    transactions = [];
    monthlyBudget = 0;

    updateDashboard();
    updateBudgetView?.();
    updateCategoryBudgetUI?.();
    updateCategoryBreakdown?.();

    initPinLock();
    showToast("App reset");
  });
}

/************************************
 * GLOBAL CURRENCY DETECTION
 ************************************/

let currencySymbol = '₹'; // default

function getCurrencySymbolFromLocale(locale) {
    try {
        const currency = new Intl.NumberFormat(locale, {
            style: 'currency',
            currencyDisplay: 'symbol',
            currency: guessCurrency(locale)
        }).formatToParts(1).find(p => p.type === 'currency').value;

        return currency || '₹';
    } catch (e) {
        return '₹';
    }
}

function guessCurrency(locale) {
    const map = {
        'IN': 'INR',
        'US': 'USD',
        'GB': 'GBP',
        'AE': 'AED',
        'SA': 'SAR',
        'EU': 'EUR',
        'AU': 'AUD',
        'CA': 'CAD',
        'JP': 'JPY'
    };

    const country = locale.split('-')[1];
    return map[country] || 'USD';
}

/* ✅ Called from Android WebView */
function setCurrencyFromAndroid(locale) {
    currencySymbol = getCurrencySymbolFromLocale(locale);
    refreshCurrencyUI();
}

/* ✅ Browser fallback */
function detectCurrencyAuto() {
    const locale = navigator.language || 'en-IN';
    currencySymbol = getCurrencySymbolFromLocale(locale);
}

function refreshCurrencyUI() {
    updateDashboard();
    filterTransactions();
}

function formatMoney(amount) {
    return `${currencySymbol} ${Number(amount).toFixed(2)}`;
}

// Toast function
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toast._hideTimeout) clearTimeout(toast._hideTimeout);
  
  toast.textContent = message;
  toast.classList.remove('success', 'error', 'info');
  toast.classList.add('show', type);

  toast._hideTimeout = setTimeout(() => {
    toast.classList.remove('show', type);
  }, duration);
}

// Custom confirm dialog
let confirmResolve, confirmReject;

function customConfirm(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmDialog').style.display = 'flex';
  });
}


// updateDashboard me ye add karo:
function updateDashboard() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthlyExpenses = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpenses += t.amount;
        if (t.date.substring(0, 7) === currentMonth && t.type === 'expense') 
            monthlyExpenses += t.amount;
    });
    
    const totalBalance = totalIncome - totalExpenses;
    
    // ✅ TOTAL BALANCE (Green/Red)
    const totalBalanceEl = document.getElementById('totalBalance');
    totalBalanceEl.textContent = formatMoney(totalBalance);
    totalBalanceEl.className = totalBalance >= 0 ? 'stat-value positive' : 'stat-value negative';
    
    // ✅ INCOME (Always Green)
    const totalIncomeEl = document.getElementById('totalIncome');
    totalIncomeEl.innerHTML = `<span class="positive">${formatMoney(totalIncome)}</span>`;
    
    // ✅ EXPENSES (Always Red)
    const totalExpensesEl = document.getElementById('totalExpenses');
    totalExpensesEl.innerHTML = `<span class="negative">${formatMoney(totalExpenses)}</span>`;
    
    updateRecentTransactions();
    drawDailyExpenseChart();
    drawMonthlyExpenseChart();
}

function drawDailyExpenseChart() {
  const ctx = document.getElementById('dailyExpenseChart');
  if (!ctx) return;

  const currentMonth = new Date().toISOString().substring(0, 7);
  const dayMap = {};

  transactions.forEach(t => {
    if (t.type === 'expense' && t.date.substring(0, 7) === currentMonth) {
      const day = parseInt(t.date.split('-')[2], 10);
      dayMap[day] = (dayMap[day] || 0) + t.amount;
    }
  });

  const days = Object.keys(dayMap).sort((a, b) => a - b);
  const values = days.map(d => dayMap[d]);

  if (dailyExpenseChart) dailyExpenseChart.destroy();

  dailyExpenseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Daily Expense',
        data: values,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255,107,107,0.15)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#6b7280', font: { size: 10 } },
          grid: { color: 'rgba(209,213,219,0.5)' }
        },
        x: {
          ticks: { color: '#6b7280', font: { size: 9 } },
          grid: { display: false }
        }
      }
    }
  });
}

function drawMonthlyExpenseChart() {
  const canvas = document.getElementById('monthlyExpenseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const filterSelect = document.getElementById('monthlyCategoryFilter');
  const selectedCategory = filterSelect ? filterSelect.value : '';

  const labels = [];
  const data = [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);

    const chartYear = d.getFullYear();
    const chartMonth = d.getMonth();

    labels.push(
      d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    );

    let monthTotal = 0;

    transactions.forEach(t => {
      if (t.type !== 'expense') return;

      const txDate = new Date(t.date);   // 🔥 FIX
      if (isNaN(txDate)) return;

      if (
        txDate.getFullYear() === chartYear &&
        txDate.getMonth() === chartMonth
      ) {
        if (!selectedCategory || t.category === selectedCategory) {
          monthTotal += Number(t.amount) || 0;
        }
      }
    });

    data.push(monthTotal);
  }

  if (monthlyExpenseChart) {
    monthlyExpenseChart.destroy();
  }

  monthlyExpenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: selectedCategory ? `${selectedCategory} expense` : 'All expenses',
        data,
        backgroundColor: function (context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;

          // Initial render pe chartArea undefined hota hai
          if (!chartArea) return null;

          // Vertical gradient (niche se upar)
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.bottom,
            0,
            chartArea.top
          );

          gradient.addColorStop(1, '#f7090948');   // bottom color
          gradient.addColorStop(0, '#5008f7bb');   // top color

          return gradient;
        },
        borderColor: '#f7090948',
        borderWidth: 2,

        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', options);
}

// Set filter month to current
function setFilterMonth() {
    const today = new Date().toISOString().substring(0, 7);
    document.getElementById('filterMonth').value = today;
    document.getElementById('filterMonth').addEventListener('change', filterByMonth);
}

// Switch tabs
function switchTab(tabName, event) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  // Refresh content per tab
  if (tabName === 'dashboard') updateDashboard();
  else if (tabName === 'budget') updateBudgetView();
  else if (tabName === 'history') filterTransactions();
  else if (tabName === 'add') {
    currentType = 'expense';
    updateCategoryOptions();
    resetForm && resetForm();
  }
}

function filterTransactions() {
    const searchTerm = document.getElementById('transactionSearch').value.toLowerCase();
    const monthFilter = document.getElementById('filterMonth').value;
    
    const filtered = transactions.filter(t => {
        // Month filter
        const monthMatch = !monthFilter || t.date.substring(0, 7) === monthFilter;
        
        // Search filter ✅ FIXED
        const description = (t.description || '').toLowerCase();
        const searchMatch = !searchTerm || 
            t.category.toLowerCase().includes(searchTerm) ||
            description.includes(searchTerm) ||  // ✅ Safe check
            t.amount.toString().includes(searchTerm);
        
        return monthMatch && searchMatch;
    }).slice().reverse();
    
    showTransactions(filtered);
}

function showTransactions(transactions) {
    const container = document.getElementById('allTransactions');
    
    if (!container) return;  // ✅ Container check
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;">
                <div style="font-size:24px;margin-bottom:12px;">🔍</div>
                <div style="font-weight:600;margin-bottom:8px;">No transactions found</div>
                <div>Try different keywords or clear filters</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(t => {
        const amountClass = t.type === 'income' ? 'positive' : 'negative';
        return `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">${getCategoryEmoji(t.category)} ${t.category}</div>
                    <div class="expense-description">${t.description || 'No description'}</div>
                    <div class="expense-date">${new Date(t.date).toLocaleDateString('en-IN')}</div>
                </div>
                <div class="expense-right">
                    <div class="expense-amount ${amountClass}">${formatMoney(t.amount)}</div>
                    <button class="btn btn-danger" onclick="deleteTransaction(${t.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Set transaction type
let currentType = 'expense';  // TOP pe hona chahiye

function setType(type) {
    currentType = type;
    
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    updateCategoryOptions();   // ✅ Ye call hona zaruri hai
}

function updateCategoryOptions() {
    const select = document.getElementById('category');
    if (!select) return;

    select.innerHTML = '';

    const list = currentType === 'expense'
        ? expenseCategories
        : incomeCategories;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select category';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    list.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent =
            `${getCategoryEmoji(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
        select.appendChild(opt);
    });
}


// Add transaction
function addTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    if (!amount || !category || !date) {
        // alert('Please fill in all required fields');
        showToast('Please fill in all required fields');  // ✅ Actual function call
        return;
    }
    const transaction = {
        id: Date.now(),
        type: currentType,
        amount: amount,
        category: category,
        date: date,
        description: description,
        timestamp: new Date().toISOString()
    };
    transactions.push(transaction);
    saveToLocalStorage();
    updateRecentTransactions();  // ✅ Add ke baad list refresh
    updateDashboard();      // ✅
    updateBudgetView();     // ✅ CURRENCY UPDATE
    resetForm();
    showToast('Transaction added successfully!', 'success');
}
// Reset form
    function resetForm() {
    document.getElementById('amount').value = '';
    document.getElementById('category').value = '';
    document.getElementById('description').value = '';
    setDefaultDate();
    currentType = 'expense';
    document.querySelectorAll('[data-type]').forEach(btn => btn.classList.remove('selected'));
    document.querySelector('[data-type="expense"]').classList.add('selected');
    updateCategoryOptions();
}

// Total Budget
function setBudget() {
    const budget = parseFloat(document.getElementById('budgetAmount').value);
    if (!budget || budget <= 0) {
        showToast('Please enter valid budget', 'error');
        return;
    }
    monthlyBudget = budget;
    saveToLocalStorage();  // ✅ Save immediately
    updateBudgetView();
    showToast(`Budget set: ${formatMoney(budget)}`, 'success');
}

// Update recent transactions
function updateRecentTransactions() {
    const recent = transactions.slice().reverse().slice(0, 5);
    const container = document.getElementById('recentTransactions');
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-text">No transactions yet</div>
                <div class="empty-subtext">Start by adding your first expense or income</div>
            </div>
        `;
        return;
    }
    
    // Recent Transactions
    container.innerHTML = recent.map(t => {
        const amountClass = t.type === 'income' ? 'positive' : 'negative';
        return `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">${getCategoryEmoji(t.category)} ${t.category}</div>
                    <div class="expense-description">${t.description || 'No description'}</div>
                    <div class="expense-date">${new Date(t.date).toLocaleDateString('en-IN')}</div>
                </div>
                
                <!-- ✅ RIGHT SECTION: Amount + Delete -->
                <div class="expense-right">
                    <div class="expense-amount ${amountClass}">
                        ${formatMoney(t.amount)}
                    </div>
                    <button class="btn btn-danger" onclick="deleteTransaction(${t.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

}

// 2. Load on startup
loadCategoryBudgets();
updateCategoryBudgetUI(); // Show UI

function loadCategoryBudgets() {
    const data = JSON.parse(localStorage.getItem('spendingTrackerData') || '{}');
    categoryBudgets = data.categoryBudgets || categoryBudgets;
}

function updateCategoryBudgetUI() {
    const container = document.getElementById('categoryBudgetList');
    if (!container) return;

    const total = Object.values(categoryBudgets)
        .reduce((a, b) => a + b, 0);

    // 🔵 TOP TOTAL + PIE
    const totalHTML = `
        <div class="total-budget-row split" >
            <div class="total-budget-left">
                <div class="label">Monthly Budget</div>

                <div class="amount-hint" style="font-weight: 600;">${formatMoney(monthlyBudget)}</div>
            </div>

            <div class="total-budget-right">
                <canvas id="categoryBudgetPie" width="120" height="120"></canvas>
            </div>
        </div>
    `;

    // 🔵 CATEGORY ROWS WITH %
    const rowsHTML = Object.entries(categoryBudgets).map(([cat, budget]) => {
        const percent = total > 0 ? Math.round((budget / total) * 100) : 0;

        return `
            <div class="category-budget-row">
                <div class="category-name">
                    ${getCategoryEmoji(cat)} ${cat}
                    <small class="cat-percent">(${percent}%)</small>
                </div>

                <div class="budget-input-wrapper">
                    <input
                        type="number"
                        value="${budget}"
                        min="0"
                        step="100"
                        class="budget-input"
                        onchange="setCategoryBudget('${cat}', this.value)"
                    />
                    <span class="currency-symbol">${currencySymbol}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = totalHTML + rowsHTML;

    drawCategoryBudgetPie();
}

function drawCategoryBudgetPie() {
    const ctx = document.getElementById('categoryBudgetPie');
    if (!ctx) return;

    let total = Object.values(categoryBudgets).reduce((a, b) => a + b, 0);
    if (total <= 0) return;

    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(categoryBudgets).forEach(([cat, val]) => {
        if (val > 0) {
            const percent = ((val / total) * 100).toFixed(0);
            labels.push(`${getCategoryEmoji(cat)} ${percent}%`);
            data.push(val);
            colors.push(`hsl(${Math.random() * 360},70%,60%)`);
        }
    });

    if (window.categoryBudgetChart) {
        window.categoryBudgetChart.destroy();
    }

    window.categoryBudgetChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{ data, backgroundColor: colors }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });
}


function setCategoryBudget(cat, value) {
    categoryBudgets[cat] = parseFloat(value) || 0;

    // 🔥 TOTAL RECALCULATE
    monthlyBudget = Object.values(categoryBudgets)
        .reduce((sum, v) => sum + (Number(v) || 0), 0);

    saveToLocalStorage();

    // 🔥 FULL UI REFRESH
    updateCategoryBudgetUI();
    updateDashboard();
    updateBudgetView();
    updateCategoryBreakdown();
}

function setMonthlyBudgetFromCategory(value) {
    monthlyBudget = parseFloat(value) || 0;

    saveToLocalStorage();

    updateDashboard();
    updateBudgetView();
    updateCategoryBudgetUI();
}

// Category Budgets Save
function saveCategoryBudgets() {
    updateTotalBudgetFromCategories();
    saveToLocalStorage();  // ✅ Save everything
    showToast('✅ All budgets saved!', 'success');
}

// ✅ 4. Category Breakdown (separate function)
function updateCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    if (!container) return;
    
    container.innerHTML = Object.entries(categoryBudgets)
        .filter(([cat]) => categoryBudgets[cat] > 0)
        .sort((a, b) => categoryBudgets[b[0]] - categoryBudgets[a[0]])
        .map(([cat, budget]) => {
            const spent = getCategoryMonthlySpent(cat);
            const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const status = percentage > 100 ? 'danger' : percentage > 80 ? 'warning' : '';
            
            return `
                <div class="card" style="margin-bottom: 5px; border: 1px solid var(--primary); padding: 8px; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500;">${getCategoryEmoji(cat)} ${cat}</span>
                        <div style="text-align: right;">
                            <div style="font-size: 12px;">${formatMoney(spent)} / ${formatMoney(budget)}</div>
                            <div style="font-size: 10px; color: ${status === 'danger' ? '#f44336' : status === 'warning' ? '#ff9800' : '#4caf50'};">
                                ${percentage.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                    <div class="budget-bar" style="height: 6px;">
                        <div class="budget-fill ${status}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('') || 
        '<div class="empty-state"><span>Set category budgets to see breakdown</span></div>';
}

// Auto-calculate total budget from categories
function updateTotalBudgetFromCategories() {
    const total = Object.values(categoryBudgets)
        .reduce((sum, v) => sum + (Number(v) || 0), 0);

    monthlyBudget = total;

    saveToLocalStorage();
}


// ✅ 2. Helper function
function getCategoryMonthlySpent(category) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
        .filter(t => t.date.substring(0, 7) === currentMonth && 
                    t.type === 'expense' && t.category === category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function getCategorySpendThisMonth() {
    const monthKey = new Date().toISOString().substring(0, 7);
    const categoryTotals = {};

    transactions.forEach(t => {
        if (t.type === 'expense' && t.date.startsWith(monthKey)) {
            categoryTotals[t.category] =
                (categoryTotals[t.category] || 0) + Number(t.amount);
        }
    });

    return categoryTotals;
}

function updateBudgetView() {
    const el = document.getElementById('budgetOverview');
    if (!el) return;

    if (!monthlyBudget || monthlyBudget <= 0) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <div class="empty-text">No budget set</div>
            </div>
        `;
        return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    let monthlySpent = 0;
    const monthKey = now.toISOString().substring(0, 7);

    transactions.forEach(t => {
        if (t.type === 'expense' && t.date.startsWith(monthKey)) {
            monthlySpent += Number(t.amount);
        }
    });

    const dailyAvg = monthlyBudget / totalDays;
    const allowedTillToday = dailyAvg * today;
    const percentRaw = (monthlySpent / monthlyBudget) * 100;
    const percent = Math.min(percentRaw, 100);

    const statusText =
        percentRaw < 70 ? "Good" :
        percentRaw < 90 ? "Careful" :
        percentRaw <= 100 ? "Warning" :
        "Overbudget";

    const statusColor =
        percentRaw < 60 ? "#22c55e" :
        percentRaw < 90 ? "#f59e0b" :
        percentRaw <= 100 ? "#ef4444" :
        "#a10808ff";

    // 🔁 RESET MESSAGES
    budgetMessages = [];

    if (monthlySpent <= allowedTillToday) {
        budgetMessages.push("🎉 You're managing your budget well!");
    } else if (monthlySpent <= allowedTillToday * 1.1) {
        budgetMessages.push("⚠️ Spending is slightly fast.");
    } else {
        budgetMessages.push("🚨 You're overspending this month!");
    }

    // 🔴 CATEGORY WARNINGS
    const categoryTotals = getCategorySpendThisMonth();

    Object.keys(categoryBudgets || {}).forEach(cat => {
        const limit = categoryBudgets[cat];
        const spent = categoryTotals[cat] || 0;
        if (limit > 0) {
            const p = (spent / limit) * 100;
            
            if (p >= 90) {
                budgetMessages.push(
                    `⚠️ Spending on ${cat} is ${p.toFixed(0)}%, be careful!`
                );
            }
        }
    });

    el.innerHTML = `
        <div class="total-budget-row split">
            <div class="budget-left">
                <div class="progress-circle" style="
                    background: conic-gradient(
                        ${statusColor} ${percent}%,
                        #e5e7eb 0
                    );
                ">
                    <div class="progress-inner">
                        <div class="progress-percent">${percentRaw.toFixed(0)}%</div>
                        <div class="progress-label" 
                            style="color:${statusColor}">
                            ${statusText}
                        </div>

                    </div>
                </div>
            </div>

            <div class="budget-right">
                <div class="row">
                    <span class="label">Budget</span>
                    <strong class="value">${formatMoney(monthlyBudget)}</strong>
                </div>
                <div class="row">
                    <span class="label">Spent</span>
                    <strong class="value">${formatMoney(monthlySpent)}</strong>
                </div>
                <div class="row">
                    <span class="label">Left</span>
                    <strong class="value">${formatMoney(monthlyBudget - monthlySpent)}</strong>
                </div>
                <div class="row">
                    <span class="label">Allowed</span>
                    <strong class="value">${formatMoney(allowedTillToday)}</strong>
                </div>
            </div>

        </div>
        <div class="card" style="min-height: 44px; margin-top: 16px; padding: 16px; border-radius: 6px; background: #fd7302;">
            <div class="budget-message highlight" id="budgetMessage"></div>
        </div>
    `;

    startBudgetMessageRotation();
    updateCategoryBreakdown();
}

function startBudgetMessageRotation() {
    clearInterval(budgetMessageInterval);

    if (!budgetMessages.length) return;

    const el = document.getElementById('budgetMessage');
    currentMessageIndex = 0;

    el.textContent = budgetMessages[0];

    budgetMessageInterval = setInterval(() => {
        currentMessageIndex =
            (currentMessageIndex + 1) % budgetMessages.length;
        el.textContent = budgetMessages[currentMessageIndex];
    }, 10000);
}




// 4. Update button handler
function updateCategoryBudgets() {
    updateTotalBudgetFromCategories();
    saveCategoryBudgets();
    showToast('Category budgets saved!', 'success');
}


// Filter by month
function filterByMonth() {
    const filterMonth = document.getElementById('filterMonth').value;
    const filtered = transactions.filter(t => t.date.substring(0, 7) === filterMonth).slice().reverse();
    const container = document.getElementById('allTransactions');
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-text">No transactions for this month</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(t => {
        const amountClass = t.type === 'income' ? 'positive' : 'negative';
        return `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">${getCategoryEmoji(t.category)} ${t.category}</div>
                    <div class="expense-description">${t.description || 'No description'}</div>
                    <div class="expense-date">${new Date(t.date).toLocaleDateString('en-IN')}</div>
                </div>
                <div class="expense-amount ${amountClass}">
                    ${formatMoney(t.amount)}
                </div>
                <button class="btn btn-danger" onclick="deleteTransaction(${t.id})">🗑️</button>
            </div>
        `.trim().replace(/\s+/g, ' ');
    }).join('');
}

// Delete transaction
async function deleteTransaction(id) {
    const confirmed = await customConfirm('Are you sure you want to delete this transaction?');
    
    if (confirmed) {
        transactions = transactions.filter(t => t.id !== id);
        saveToLocalStorage();
        updateDashboard();
        filterByMonth();
        updateBudgetView();
        
        showToast('Transaction deleted successfully!', 'success', 3000);
    }
}

// Get total monthly expenses
function getTotalMonthlyExpenses() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
        .filter(t => t.date.substring(0, 7) === currentMonth && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
}

// LocalStorage functions
function saveToLocalStorage() {
    const data = {
        transactions: transactions,
        monthlyBudget: monthlyBudget,
        categoryBudgets: categoryBudgets  // ✅ Category budgets bhi save
    };
    localStorage.setItem('spendingTrackerData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    try {
        const dataStr = localStorage.getItem('spendingTrackerData');
        if (dataStr) {
            const data = JSON.parse(dataStr);
            transactions = data.transactions || [];
            monthlyBudget = data.monthlyBudget || 0;
            categoryBudgets = data.categoryBudgets || {
                food: 0, groceries: 0, transport: 0, clothing: 0,
                debt: 0, savings: 0, shopping: 0, utilities: 0,
                health: 0, travel: 0, housing: 0, entertainment: 0,
                education: 0, other: 0
            };  // ✅ Default categories
        }
    } catch (e) {
        console.error('Load error:', e);
    }
}

// Export data
function exportData() {
    const dataStr = JSON.stringify({ transactions, monthlyBudget }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spending-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function blobToBase64(blob, callback) {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        callback(base64);
    };
    reader.readAsDataURL(blob);
}

function exportDataAsExcel() {
    let csv = `Date,Category,Description,Type,Amount(${currencySymbol})\n`;

    transactions.slice().reverse().forEach(t => {
        const date = new Date(t.date).toLocaleDateString("en-IN");
        const amount =
            t.type === "income"
                ? (t.amount)
                : "-" + (t.amount);

        csv += `"${date}","${t.category}","${t.description}","${t.type.toUpperCase()}","${amount}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `spending-tracker-${new Date().toISOString().split("T")[0]}.csv`;

    if (window.Android && Android.downloadFile) {
        blobToBase64(blob, base64 => {
            Android.downloadFile(fileName, base64, "text/csv");
            showToast("📊 Excel downloading...");
        });
    } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    }
}

async function exportDataAsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ===== TITLE =====
    doc.setFontSize(14);
    doc.text("SPENDING TRACKER REPORT", 14, 15);

    doc.setFontSize(10);
    doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN')}`,
        14,
        22
    );

    // ===== SUMMARY =====
    let totalIncome = 0, totalExpenses = 0;
    transactions.forEach(t => {
        t.type === "income"
            ? totalIncome += t.amount
            : totalExpenses += t.amount;
    });

    doc.autoTable({
        startY: 28,
        head: [[`Total Income (${currencySymbol})`, `Total Expenses (${currencySymbol})`, `Balance (${currencySymbol})`]],
        body: [[
            `${totalIncome}`,
            `${totalExpenses}`,
            `${totalIncome - totalExpenses}`
        ]],
        styles: { halign: "center", fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] }
    });

    // ===== TRANSACTION TABLE =====
    const tableData = transactions
        .slice()
        .reverse()
        .map(t => [
            new Date(t.date).toLocaleDateString("en-IN"),
            t.category,
            t.description || "-",
            t.type.toUpperCase(),
            t.type === "expense"
                ? `-${t.amount}`
                : `${t.amount}`
        ]);


    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [[
            "Date",
            "Category",
            "Description",
            "Type",
            `Amount (${currencySymbol})`
        ]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: {
            4: { halign: "right" }
        }
    });

    // ===== EXPORT =====
    const fileName = `spending-report-${Date.now()}.pdf`;

    if (window.Android && Android.downloadFile) {
        const base64 = doc.output("datauristring").split(",")[1];
        Android.downloadFile(fileName, base64, "application/pdf");
        showToast("📄 PDF downloading...");
    } else {
        doc.save(fileName);
    }
}


function shareApp() {
    const text =
        "💰 Spending Tracker App\n\n" +
        "Track expenses, set budgets & save smartly.\n\n" +
        "📲 Download:\n" +
        "https://play.google.com/store/apps/details?id=com.sharweensoft.spendingtracker";

    // ✅ Android WebView
    if (window.Android && Android.shareText) {
        Android.shareText(text);
        return;
    }

    // ✅ Browser fallback
    if (navigator.share) {
        navigator.share({
            title: "Spending Tracker",
            text: text
        });
    } else {
        navigator.clipboard.writeText(text);
        alert("Share text copied!");
    }
}


function rateUs() {
    try {
        if (window.Android && typeof Android.rateApp === "function") {
            Android.rateApp();   // 📱 Android App → Play Store
        } else {
            throw "Not Android";
        }
    } catch (e) {
        // 🌐 Browser fallback
        window.open(
            "https://play.google.com/store/apps/details?id=com.sharweensoft.spendingtracker",
            "_blank"
        );
    }
}

function toggleAddPanel() {
  const panel = document.getElementById('add');
  panel.classList.toggle('show');
}

document.getElementById('add').addEventListener('click', e => {
  if (e.target.id === 'add') {
    toggleAddPanel();
  }
});