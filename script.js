// ✅ Global state
let transactions = [];
let monthlyBudget = 0;
// let categoryBudgets = {};  // Empty initially, loaded from storage

// ✅ Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    currentType = 'expense';
    updateCategoryOptions();  // ✅ initial state
    loadFromLocalStorage();  // Load ALL data first
    setDefaultDate();
    updateDashboard();
    setFilterMonth();
    updateBudgetView();      // Refresh budgets
    updateCategoryBudgetUI(); // Show category inputs
    // ✅ Search events
    const searchInput = document.getElementById('transactionSearch');
    const monthFilter = document.getElementById('filterMonth');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterTransactions);
    }
    if (monthFilter) {
        monthFilter.addEventListener('change', filterTransactions);
    }
    
    // Initial load
    filterTransactions();
});

// Currency functions (TOP PE - FIXED)
let currencySymbol = getCurrencySymbol();

function getCurrencySymbol() {
    // Method 1: Check if India timezone/location
    const isIndia = Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Asia/Kolkata') ||
                    navigator.language?.includes('IN');
    
    if (isIndia) return '₹';
    
    // Method 2: Intl automatic detection
    try {
        // Try INR first (India), fallback to USD
        return new Intl.NumberFormat('default', { 
            style: 'currency', 
            currency: 'INR' 
        }).formatToParts(1)[0].value;
    } catch (e) {
        return '$'; // Final fallback
    }
}

function formatMoney(amount) {
    const absAmount = Math.abs(amount);
    
    // Agar integer hai (.00) to sirf whole number dikhao
    const formattedAmount = absAmount % 1 === 0 
        ? Math.round(absAmount).toString() 
        : absAmount.toFixed(2);
    
    const sign = amount < 0 ? '-' : '';
    return sign + currencySymbol + ' ' + formattedAmount;
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

// Dialog event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('confirmYes').onclick = () =>{
    document.getElementById('confirmDialog').style.display = 'none';
    if (confirmResolve) confirmResolve(true);
  };

  document.getElementById('confirmNo').onclick = () => {
    document.getElementById('confirmDialog').style.display = 'none';
    if (confirmResolve) confirmResolve(false);
  };

  // ESC key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('confirmDialog').style.display === 'flex') {
      document.getElementById('confirmNo').click();
    }
  });

  // ✅ SEARCH LISTENERS
    document.getElementById('transactionSearch').addEventListener('input', function() {
        filterTransactions();
    });
    
    document.getElementById('filterMonth').addEventListener('change', filterTransactions);
    
    // Initial load
    setFilterMonth();
    filterTransactions();
});


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
}

// ✅ INITIALIZE APP (combined)
    setDefaultDate();
    loadFromLocalStorage();
    updateDashboard();
    setFilterMonth();

    // Currency check har 2 sec
    setInterval(detectAndUpdateCurrency, 2000);

// Load data on startup
window.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    loadFromLocalStorage();
    updateDashboard();
    setFilterMonth();
});

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
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');  // Active button
    
    // Refresh content
    if (tabName === 'dashboard') updateDashboard();
    else if (tabName === 'budget') updateBudgetView();
    else if (tabName === 'history') filterTransactions();  // ✅ History
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

    updateCategoryOptions();   // ✅ Ye call hona zaruri hai
}

function updateCategoryOptions() {
    const categorySelect = document.getElementById("category");
    const groups = categorySelect.querySelectorAll("optgroup");

    // groups[0] = Expenses
    // groups[1] = Income

    if (currentType === "income") {
        groups[0].style.display = "none";   // hide expenses
        groups[1].style.display = "block";  // show income
    } else {
        groups[0].style.display = "block";  // show expenses
        groups[1].style.display = "none";   // hide income
    }

    categorySelect.value = "";
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

// ✅ 1. Global variables (TOP PE add karo)
let categoryBudgets = {
    food: 0, groceries: 0, transport: 0, clothing: 0, 
    debt: 0, savings: 0, shopping: 0, utilities: 0,
    health: 0, travel: 0, housing: 0, entertainment: 0, 
    education: 0, other: 0
};

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

    container.innerHTML = Object.entries(categoryBudgets).map(([cat, budget]) => `
        <div class="category-budget-row">
            <div class="category-name">${getCategoryEmoji(cat)} ${cat}</div>
            <div class="budget-input-wrapper">
                <input type="number"
                    value="${budget}"
                    min="0"
                    step="100"
                    class="budget-input"
                    onchange="setCategoryBudget('${cat}', parseFloat(this.value) || 0)">
                <span class="currency-symbol">${currencySymbol}</span>
            </div>
        </div>
    `).join('') + `
        <div class="total-budget-row">
            <div class="category-name"><strong>Total Budget</strong></div>
            <div class="budget-input-wrapper">
                <strong id="totalCategoryBudget" style='font-size: 12px;'>${formatMoney(monthlyBudget)}</strong>
            </div>
        </div>
    `;
}

function setCategoryBudget(category, budget) {
    categoryBudgets[category] = budget;
    updateTotalBudgetDisplay();
}

function updateCategoryBudget(category, value) {
    categoryBudgets[category] = parseFloat(value) || 0;
    // updateTotalBudgetDisplay();
    updateTotalBudgetFromCategories();   // ✅ har change pe total auto update

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
        .reduce((sum, budget) => sum + budget, 0);

    monthlyBudget = total;
    
    const budgetInput = document.getElementById('budgetAmount');
    const totalLabel = document.getElementById('totalCategoryBudget');

    if (budgetInput) budgetInput.value = total.toFixed(0);
    if (totalLabel) totalLabel.textContent = formatMoney(total);

    saveToLocalStorage();
    updateBudgetView();
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
    content += `Generated: ${new Date().toLocaleDateString('en-IN')}\n\n`;

    let totalIncome = 0, totalExpenses = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpenses += t.amount;
    });

    content += "SUMMARY\n";
    content += "--------------------------------------------------\n";
    content += `Total Income: ₹${totalIncome.toFixed(2)}\n`;
    content += `Total Expenses: ₹${totalExpenses.toFixed(2)}\n`;
    content += `Balance: ₹${(totalIncome - totalExpenses).toFixed(2)}\n`;
    content += `Monthly Budget: ₹${monthlyBudget.toFixed(2)}\n\n`;

    content += "ALL TRANSACTIONS\n";
    content += "--------------------------------------------------\n";

    transactions.slice().reverse().forEach(t => {
        content += `${new Date(t.date).toLocaleDateString('en-IN')} | ${t.category} | ${t.description} | ${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}\n`;
    });

    // CREATE PDF-BLOB
    const blob = new Blob([content], { type: "application/pdf" });
    const fileName = `spending-report-${new Date().toISOString().split('T')[0]}.pdf`;

    // ANDROID WEBVIEW EXPORT (BLOB → BASE64)
    if (typeof Android !== "undefined" && Android.downloadFile) {

        blobToBase64(blob, function (base64) {
            Android.downloadFile(fileName, base64, "application/pdf");
            showToast("📄 PDF Downloading...");
        });

    } else {
        // NORMAL BROWSER DOWNLOAD
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


// ✅ FIXED: Currency LIVE detect
function detectAndUpdateCurrency() {
    const newSymbol = getCurrencySymbol();
    if (newSymbol !== currencySymbol) {
        currencySymbol = newSymbol;
        updateDashboard();
        updateBudgetView();
        filterByMonth();
        updateRecentTransactions();
    }
}


// Har 2 second me check karo (user location change ho sakti hai)
setInterval(detectAndUpdateCurrency, 2000);
