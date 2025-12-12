// ✅ Global state
let transactions = [];
let monthlyBudget = 0;



let locale = "en-US";

if (window.androidLocale) {
    locale = `${window.androidLocale.lang}-${window.androidLocale.region}`;
} else {
    locale = navigator.language || "en-US";
}

function getCurrencyFromLocale(loc) {
    try {
        const formatter = new Intl.NumberFormat(loc, { style: "currency", currency: "USD" });
        return formatter.resolvedOptions().currency;
    } catch (e) {
        return "USD";
    }
}





// --- Compatibility wrapper used by older code (keeps older calls working) ---
function detectCurrency() {
    // return same shape as previous implementations
    try {
        return detectCurrencyByRegion();
    } catch (e) {
        return { locale: (navigator.language||'en-US'), region: 'US', currency: 'USD', symbol: '$' };
    }
}

// ----------------- CURRENCY GLOBALS (must be at top) -----------------
let APP_CURRENCY = localStorage.getItem('APP_CURRENCY') || "";
let currencySymbol = localStorage.getItem('APP_SYMBOL') || ""; // This was causing the error when undefined
// --------------------------------------------------------------------

// ------------------ REAL CURRENCY DETECTOR ------------------

function detectCurrencyByRegion() {
    const locale = navigator.language || "en-US";

    // mapping: region -> currency
    const regionToCurrency = {
        "IN": "INR",
        "US": "USD",
        "GB": "GBP",
        "JP": "JPY",
        "KR": "KRW",
        "FR": "EUR",
        "DE": "EUR",
        "SA": "SAR",
        "RU": "RUB",
        "ID": "IDR",
        "BR": "BRL",
        "CA": "CAD",
        "AU": "AUD",
        "CN": "CNY",
        "TW": "TWD",
        "SG": "SGD",
        "AE": "AED",
        "ZA": "ZAR"
    };

    let region = locale.split("-")[1];

    // fallback: if device gives only "en" instead of "en-US"
    if (!region) {
        try {
            region = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[1];
        } catch (e) {}
    }

    let currency = regionToCurrency[region] || "USD";

    let symbol = currency;
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency,
            currencyDisplay: "symbol"
        }).formatToParts(1);
        const cPart = parts.find(p => p.type === "currency");
        if (cPart && cPart.value) symbol = cPart.value;
    } catch (e) {
        // fallback to currency code
        symbol = currency;
    }
    return { locale, region, currency, symbol };
}

function detectAndUpdateCurrency() {
    const out = detectCurrencyByRegion();

    APP_CURRENCY = out.currency;
    currencySymbol = out.symbol;

    localStorage.setItem("APP_CURRENCY", APP_CURRENCY);
    localStorage.setItem("APP_SYMBOL", currencySymbol);

    console.log("DETECTED:", out.locale, "→", out.currency, out.symbol);
}





// ✅ 1. Global variables (TOP PE add karo)
let categoryBudgets = {
    food: 0, groceries: 0, transport: 0, clothing: 0, 
    debt: 0, savings: 0, shopping: 0, utilities: 0,
    health: 0, travel: 0, housing: 0, entertainment: 0, 
    education: 0, other: 0
};

document.addEventListener('DOMContentLoaded', function () {

    // ---------- INITIAL SETUP ----------
    currentType = 'expense';
    detectAndUpdateCurrency();      // Set correct symbol first
    loadFromLocalStorage();         // Load all saved data
    setDefaultDate();               // Set date fields
    updateCategoryOptions();        // Set category based on type
    updateDashboard();              // Update home stats
    setFilterMonth();               // Set current month
    updateBudgetView();             // Budget UI
    updateCategoryBudgetUI();       // Category budget UI
    filterTransactions();           // Show initial transactions
    
    

    // ---------- SEARCH + FILTER EVENTS ----------
    const searchInput = document.getElementById('transactionSearch');
    const monthFilter = document.getElementById('filterMonth');

    if (searchInput) {
        searchInput.addEventListener('input', filterTransactions);
    }
    if (monthFilter) {
        monthFilter.addEventListener('change', filterTransactions);
    }


    // ---------- CUSTOM CONFIRM BUTTON EVENTS ----------
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    const dialog = document.getElementById('confirmDialog');
    const msg = document.getElementById('confirmMessage');

    if (yesBtn) {
        yesBtn.onclick = () => {
            dialog.style.display = 'none';
            if (confirmResolve) confirmResolve(true);
        };
    }

    if (noBtn) {
        noBtn.onclick = () => {
            dialog.style.display = 'none';
            if (confirmResolve) confirmResolve(false);
        };
    }

    // Escape key closes dialog
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dialog.style.display === 'flex') {
            if (noBtn) noBtn.click();
        }
    });

});

function formatMoney(amount) {
    // ensure currencySymbol is present; if not, run detection synchronously
    if (!currencySymbol) {
        const tmp = detectCurrency();
        APP_CURRENCY = tmp.currency;
        currencySymbol = tmp.symbol || tmp.currency || "$";
    }

    const absAmount = Math.abs(amount || 0);
    const formattedAmount = (absAmount % 1 === 0) ? Math.round(absAmount).toString() : absAmount.toFixed(2);
    const sign = amount < 0 ? '-' : '';
    return sign + currencySymbol + ' ' + formattedAmount;
}


function updateBudgetArc(total, spent) {
    const left = total - spent;
    const percent = total > 0 ? (spent / total) * 100 : 0;

    document.getElementById("arcTotal").innerText = formatMoney(total);
    document.getElementById("arcSpent").innerText = formatMoney(spent);
    document.getElementById("arcLeft").innerText = formatMoney(left);

    const arc = document.getElementById("arc-progress");
    const L = 126; // arc length
    arc.style.strokeDashoffset = L - (L * percent / 100);
}





// Clear all data (safe, uses existing customConfirm and showToast)
async function clearAllData() {
    try {
        // Ask user for confirmation using existing customConfirm()
        const confirmed = await customConfirm('This will DELETE all transactions and budgets from this device. Are you sure?');
        if (!confirmed) return;

        // Clear local variables
        transactions = [];
        monthlyBudget = 0;
        // Reset category budgets to defaults (keeps same keys)
        categoryBudgets = {
            food: 0, groceries: 0, transport: 0, clothing: 0,
            debt: 0, savings: 0, shopping: 0, utilities: 0,
            health: 0, travel: 0, housing: 0, entertainment: 0,
            education: 0, other: 0
        };

        // Remove from localStorage
        try {
            localStorage.removeItem('spendingTrackerData');
        } catch (e) {
            console.warn('Could not remove localStorage key:', e);
        }

        // If Firebase available, try to delete docs (best-effort, guarded)
        if (typeof firebase !== 'undefined' && typeof db !== 'undefined' && typeof firebaseReady !== 'undefined' && firebaseReady) {
            try {
                // Warning: deleting many docs could be slow / costly — we do best-effort
                const snapshot = await db.collection('transactions').get();
                const batch = db.batch ? db.batch() : null;
                if (snapshot && !snapshot.empty) {
                    if (batch) {
                        snapshot.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    } else {
                        // if no batch API available, delete one-by-one
                        const deletes = [];
                        snapshot.forEach(doc => deletes.push(db.collection('transactions').doc(doc.id).delete()));
                        await Promise.all(deletes);
                    }
                }
                console.log('Firebase: all transactions deleted (if any).');
            } catch (e) {
                console.warn('Firebase clear error (ignored):', e);
            }
        }

        // Update UI safely (check elements exist)
        saveToLocalStorage(); // save cleared state (keeps consistent)
        updateDashboard();
        updateBudgetView();
        updateCategoryBudgetUI();
        updateRecentTransactions();
        filterTransactions();

        showToast('All data cleared.', 'success', 3500);
    } catch (err) {
        console.error('clearAllData error:', err);
        showToast('Error clearing data. See console.', 'error', 4000);
    }
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
    const budgetLeft = Math.max(0, monthlyBudget - monthlyExpenses);
    
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
    
    // ✅ MONTHLY EXPENSE (Always Red)
    const monthlyExpenseEl = document.getElementById('monthlyExpense');
    monthlyExpenseEl.innerHTML = `<span class="negative">${formatMoney(monthlyExpenses)}</span>`;
    
    // ✅ BUDGET LEFT (Green/Red)
    const budgetLeftEl = document.getElementById('budgetLeft');
    budgetLeftEl.textContent = formatMoney(budgetLeft);
    budgetLeftEl.className = budgetLeft >= 0 ? 'stat-value positive' : 'stat-value negative';
    
    updateRecentTransactions();
    updateArcBudget(monthlyBudget, monthlyExpense);
    updateBudgetArc(10000, 3500);

}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;

    const options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
    const dateLabel = document.getElementById("currentDate");
    if (dateLabel) {
        dateLabel.textContent = new Date().toLocaleDateString("en-IN", options);
    }
}

// Set filter month to current
function setFilterMonth() {
    const today = new Date().toISOString().substring(0, 7);
    document.getElementById('filterMonth').value = today;
    document.getElementById('filterMonth').addEventListener('change', filterByMonth);
}

// Switch tabs
function switchTab(tabName, e) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabEl = document.getElementById(tabName);
    if (tabEl) tabEl.classList.add('active');

    // mark clicked button active if event provided
    if (e && e.target) e.target.classList.add('active');

    // Refresh content
    if (tabName === 'dashboard') updateDashboard();
    else if (tabName === 'budget') updateBudgetView();
    else if (tabName === 'history') filterTransactions();
    else if (tabName === 'add') {
        currentType = "expense";
        updateCategoryOptions();
        resetForm();
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

    updateCategoryOptions();  // must rebuild options
}

// function setType(type) {
//     currentType = type;

//     // remove selected class from all category badges (use class selector)
//     document.querySelectorAll('.category-badge').forEach(btn => btn.classList.remove('selected'));

//     // try find button by id pattern `type-<type>`
//     const btn = document.getElementById('type-' + type);
//     if (btn) btn.classList.add('selected');

//     updateCategoryOptions();
// }





function updateCategoryOptions() {
    const categorySelect = document.getElementById("category");

    const expenseOptions = `
        <option value="food">🍔 Food & Dining</option>
        <option value="groceries">🛒 Groceries</option>
        <option value="transport">🚗 Transport</option>
        <option value="clothing">👗 Clothing</option>
        <option value="debt">💳 Debt</option>
        <option value="savings">💰 Savings</option>
        <option value="shopping">🛍️ Shopping</option>
        <option value="utilities">💡 Utilities</option>
        <option value="health">🏥 Health</option>
        <option value="travel">✈️ Travel</option>
        <option value="housing">🏠 Housing</option>
        <option value="entertainment">🎬 Entertainment</option>
        <option value="education">📚 Education</option>
        <option value="other">📌 Other</option>
    `;

    const incomeOptions = `
        <option value="salary">💼 Salary</option>
        <option value="freelance">💻 Freelance</option>
        <option value="investment">📈 Investment</option>
        <option value="bonus">🎁 Bonus</option>
        <option value="other-income">➕ Other Income</option>
    `;

    // Always replace full list
    categorySelect.innerHTML = `<option value="">Select Category</option>` +
        (currentType === "income" ? incomeOptions : expenseOptions);

    categorySelect.value = "";
}


// function updateCategoryOptions() {
//     const categorySelect = document.getElementById("category");

//     // Detect optgroups by label (Correct for all devices)
//     const expenseGroup = categorySelect.querySelector('optgroup[label="Expenses"]');
//     const incomeGroup = categorySelect.querySelector('optgroup[label="Income"]');

//     if (!expenseGroup || !incomeGroup) return;

//     if (currentType === "income") {
//         expenseGroup.style.display = "none";
//         incomeGroup.style.display = "block";
//     } else {
//         expenseGroup.style.display = "block";
//         incomeGroup.style.display = "none";
//     }

//     categorySelect.value = "";
// }

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

    saveToLocalStorage();

    updateBudgetView();       // 🔥 Budget Overview refresh
    updateCategoryBreakdown(); // 🔥 Breakdown refresh

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

const categoryEmojis = {
    food: '🍔',
    groceries: '🛒', 
    transport: '🚗',
    clothing: '👗',
    debt: '💳',
    savings: '💰',
    shopping: '🛍️',
    utilities: '💡',
    health: '🏥',
    travel: '✈️',
    housing: '🏠',
    entertainment: '🎬',
    education: '📚',
    other: '📌'
};

function getCategoryEmoji(category) {
    const emojis = {
        food: '🍔',
        groceries: '🛒',
        transport: '🚗',
        clothing: '👗',
        debt: '💳',
        savings: '💰',
        shopping: '🛍️',
        utilities: '💡',
        health: '🏥',
        travel: '✈️',
        housing: '🏠',
        entertainment: '🎬',
        education: '📚',
        other: '📌',
        salary: '💼',
        freelance: '💻'
    };
    return emojis[category] || '📌';
}

// 2. Load on startup
// loadCategoryBudgets();
// updateCategoryBudgetUI(); // Show UI

function loadCategoryBudgets() {
    const data = JSON.parse(localStorage.getItem('spendingTrackerData') || '{}');
    categoryBudgets = data.categoryBudgets || categoryBudgets;
}

function updateCategoryBudgetUI() {
    const container = document.getElementById('categoryBudgetList');
    if (!container) return;
    const totalRow = `
    <div class="expense-item">
        <div class="total-budget-row">
            <div class="category-name"><strong>Total Budget</strong></div>
            <div class="budget-input-wrapper">
                <strong id="totalCategoryBudget" style="font-size: 12px;">
                    ${formatMoney(monthlyBudget)}
                </strong>
            </div>
        </div>
    </div>
    `;
    const categoryRows = Object.entries(categoryBudgets).map(([cat, budget]) => `
        <div class="category-budget-row">
            <div class="category-name">${getCategoryEmoji(cat)} ${cat}</div>
            <div class="budget-input-wrapper">
                <input type="number"
                    id="budget-${cat}"
                    name="budget-${cat}"
                    value="${budget}"
                    min="0"
                    step="100"
                    class="budget-input"
                    oninput="updateCategoryValue('${cat}', this.value)">
                <span class="currency-symbol">${currencySymbol}</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = totalRow + categoryRows;
}


function updateCategoryValue(category, value) {
    categoryBudgets[category] = parseFloat(value) || 0;

    updateTotalBudgetFromCategories(); // total auto update
    updateBudgetView();                // overview update
    // updateCategoryBreakdown();         // breakdown update
    // updateDashboard();                 // dashboard update
}


// function setCategoryBudget(category, budget) {
//     categoryBudgets[category] = budget;
// }

function updateCategoryBudget(category, value) {
    categoryBudgets[category] = parseFloat(value) || 0;
    updateTotalBudgetFromCategories();   // recompute total and update UI
}

function updateTotalBudgetDisplay() {
    // convenience: shows computed total in budgetAmount + totalCategoryBudget label
    const total = Object.values(categoryBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    monthlyBudget = total;
    const budgetInput = document.getElementById('budgetAmount');
    const totalLabel = document.getElementById('totalCategoryBudget');

    if (budgetInput) budgetInput.value = total.toFixed(0);
    if (totalLabel) totalLabel.textContent = formatMoney(total);
}


// Category Budgets Save
function saveCategoryBudgets() {
    updateTotalBudgetFromCategories(); // updates monthlyBudget

    saveToLocalStorage();

    updateBudgetView();        // 🔥 Budget Overview refresh
    updateCategoryBreakdown(); // 🔥 Breakdown refresh

    showToast('Category budgets updated!', 'success');
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
                <div style="margin-bottom: 5px; border: 1px solid var(--primary); padding: 8px; border-radius: 12px;">
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
        .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

    monthlyBudget = total;

    // UI update
    const label = document.getElementById("totalCategoryBudget");
    const input = document.getElementById("budgetAmount");

    if (label) label.textContent = formatMoney(total);
    if (input) input.value = total;

    saveToLocalStorage();

    updateBudgetView();        // Budget Overview
    // updateCategoryBreakdown(); // Breakdown
    // updateDashboard();         // Dashboard
}


// ✅ 2. Helper function
function getCategoryMonthlySpent(category) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
        .filter(t => t.date.substring(0, 7) === currentMonth &&                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
                    t.type === 'expense' && t.category === category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

// Update budget view
// ✅ 3. FIXED updateBudgetView()
function updateBudgetView() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    let monthlyExpenses = 0;
    
    transactions.forEach(t => {
        if (t.date.substring(0, 7) === currentMonth && t.type === 'expense') {
            monthlyExpenses += t.amount;
        }
    });
    
    const budgetOverview = document.getElementById('budgetOverview');
    
    if (monthlyBudget === 0) {
        budgetOverview.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <div class="empty-text">No budget set</div>
                <div class="empty-subtext">Set a monthly budget to track your spending</div>
            </div>
        `;
    } else {
        const percentage = Math.min((monthlyExpenses / monthlyBudget) * 100, 100);
        budgetOverview.innerHTML = `
            <div style="padding: 5px; background: var(--md-sys-color-surface-variant); border-radius: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                    <span style="font-weight: 500; font-size: 12px">Monthly Budget</span>
                    <span style="font-weight: 500; font-size: 12px;">
                        <span class="negative">${formatMoney(monthlyExpenses)}</span> / ${formatMoney(monthlyBudget)}
                    </span>
                </div>
                <div class="budget-bar">
                    <div class="budget-fill" style="width: ${percentage}%"></div>
                </div>
                <div style="display: flex; font-size: 12px; justify-content: space-between; margin-top: 1px;">
                    <span>${percentage.toFixed(1)}% spent</span>
                    <span class="${percentage > 100 ? 'negative' : percentage > 80 ? 'negative' : 'positive'}">
                        ${monthlyBudget - monthlyExpenses >= 0 ? formatMoney(monthlyBudget - monthlyExpenses) + ' left' : 'over budget'}
                    </span>
                </div>
            </div>
        `;
    }
    
    // ✅ FIXED: Sirf breakdown update
    updateCategoryBreakdown();
}

// 4. Update button handler
function updateCategoryBudgets() {
    updateTotalBudgetFromCategories();
    saveCategoryBudgets();
    showToast('✅ Category budgets saved!', 'success');
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
// Firebase Firestore Functions
async function saveTransactionToFirestore(transaction) {
    if (!firebaseReady) return;
    try {
        await db.collection('transactions').doc(String(transaction.id)).set({
            ...transaction,
            syncedAt: new Date().toISOString()
        });
        console.log('Transaction synced to Firestore');
    } catch (e) {
        console.error('Error saving to Firestore:', e);
    }
}
async function deleteTransactionFromFirestore(id) {
    if (!firebaseReady) return;
    try {
        await db.collection('transactions').doc(String(id)).delete();
        console.log('Transaction deleted from Firestore');
    } catch (e) {
        console.error('Error deleting from Firestore:', e);
    }
}
async function loadFromFirestore() {
    if (!firebaseReady || isSyncingToFirebase) return;
    isSyncingToFirebase = true;
    try {
        const snapshot = await db.collection('transactions').get();
        if (!snapshot.empty) {
            const loaded = [];
            snapshot.forEach(doc => {
                loaded.push(doc.data());
            });
            // Merge with local data (Firebase takes priority)
            transactions = loaded;
            saveToLocalStorage();
            updateDashboard();
            updateBudgetView();
            filterByMonth();
            console.log('Transactions loaded from Firestore');
        }
    } catch (e) {
        console.error('Error loading from Firestore:', e);
    }
    isSyncingToFirebase = false;
}
async function syncAllToFirebase() {
    if (!firebaseReady) {
        // alert('Firebase not connected. Please configure Firebase settings.');
        showToast('Firebase not connected. Please configure Firebase settings.');
        return;
    }
    try {
        for (const t of transactions) {
            await saveTransactionToFirestore(t);
        }
        // alert('✅ All data synced to Firebase successfully!');
        showToast('✅ All data synced to Firebase successfully!');
    } catch (e) {
        alert('❌ Error syncing to Firebase: ' + e.message);
        console.error('Sync error:', e);
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

function downloadBlob(filename, blob) {
    const reader = new FileReader();
    reader.onload = function () {
        const base64Data = reader.result.split(',')[1];
        Android.downloadFile(filename, base64Data);
    };
    reader.readAsDataURL(blob);
}

function blobToBase64(blob, callback) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
}

// Export data as PDF
function exportDataAsPDF() {
    let content = "";
    content += "SPENDING TRACKER REPORT\n";
    content += "==================================================\n\n";
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    let totalIncome = 0, totalExpenses = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpenses += t.amount;
    });

    content += "SUMMARY\n";
    content += "--------------------------------------------------\n";
    content += `Total Income: ${currencySymbol} ${totalIncome.toFixed(2)}\n`;
    content += `Total Expenses: ${currencySymbol} ${totalExpenses.toFixed(2)}\n`;
    content += `Balance: ${currencySymbol} ${(totalIncome - totalExpenses).toFixed(2)}\n`;
    content += `Monthly Budget: ${currencySymbol} ${monthlyBudget.toFixed(2)}\n\n`;

    content += "ALL TRANSACTIONS\n";
    content += "--------------------------------------------------\n";

    transactions.slice().reverse().forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        content += `${new Date(t.date).toLocaleDateString()} | ${t.category} | ${t.description || ''} | ${sign}${currencySymbol} ${t.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([content], { type: "application/pdf" });
    const fileName = `spending-report-${new Date().toISOString().split('T')[0]}.pdf`;

    if (typeof Android !== "undefined" && Android.downloadFile) {
        blobToBase64(blob, function (base64) {
            Android.downloadFile(fileName, base64, "application/pdf");
            showToast("📄 PDF Downloading...");
        });
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast("📄 PDF Downloaded!");
    }
}

// Export data as Excel
function exportDataAsExcel() {
    let csv = "Date,Category,Description,Type,Amount\n";

    transactions.slice().reverse().forEach(t => {
        const date = new Date(t.date).toLocaleDateString("en-IN");
        const amount = t.type === "income" ? t.amount : -t.amount;
        csv += `${date},"${t.category}","${t.description}","${t.type}",${amount}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const fileName = `spending-tracker-${new Date().toISOString().split("T")[0]}.csv`;

    // If running inside Android app
    if (typeof Android !== "undefined" && Android.downloadFile) {

        blobToBase64(blob, function (base64) {
            Android.downloadFile(fileName, base64, "text/csv");  // Correct
            showToast("📊 Excel Downloading...");
        });

    } else {
        // Browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast("📊 Excel Downloaded!");
    }
}
