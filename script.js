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
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // ✅ CURRENCY REFRESH EVERY TAB
    detectAndUpdateCurrency();
    
    if (tabName === 'budget') updateBudgetView();
    else if (tabName === 'history') filterByMonth();
}


// Set transaction type
function setType(type) {
    currentType = type;
    document.querySelectorAll('[data-type]').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    
    // Update category options based on type
    updateCategoryOptions();
}

// Update category options
function updateCategoryOptions() {
    const categorySelect = document.getElementById('category');
    const currentValue = categorySelect.value;
    
    if (currentType === 'income') {
        const options = categorySelect.querySelectorAll('optgroup');
        options[0].style.display = 'none';
        options[1].style.display = 'block';
    } else {
        const options = categorySelect.querySelectorAll('optgroup');
        options[0].style.display = 'block';
        options[1].style.display = 'none';
    }
    
    categorySelect.value = '';
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

// ✅ FIXED: setBudget (no hardcoded ₹)
function setBudget() {
    const budget = parseFloat(document.getElementById('budgetAmount').value);
    if (!budget || budget <= 0) {
        showToast('Please enter a valid budget amount', 'error');
        return;
    }
    monthlyBudget = budget;
    saveToLocalStorage();
    updateBudgetView();
    showToast('Monthly budget set to ' + formatMoney(budget));  // ✅ DYNAMIC CURRENCY
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
    
    container.innerHTML = recent.map(t => {
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

// Update budget view
function updateBudgetView() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    let monthlyExpenses = 0;
    
    transactions.forEach(t => {
        if (t.date.substring(0, 7) === currentMonth && t.type === 'expense') {
            monthlyExpenses += t.amount;
        }
    });
    
    const budgetOverview = document.getElementById('budgetOverview');
    const categoryBreakdown = document.getElementById('categoryBreakdown');
    
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
            <div style="padding: 20px; background: var(--md-sys-color-surface-variant); border-radius: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-weight: 600;">Monthly Budget</span>
                    <span style="font-weight: 600; color: var(--md-sys-color-on-surface);">
                        <span class="negative">${formatMoney(monthlyExpenses)}</span> / ${formatMoney(monthlyBudget)}
                    </span>
                </div>
                <div class="budget-bar">
                    <div class="budget-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="budget-text" style="display: flex; justify-content: space-between; margin-top: 12px;">
                    <span>${percentage.toFixed(1)}% spent</span>
                    <span class="${percentage > 100 ? 'negative' : percentage > 80 ? 'negative' : 'positive'}">
                        ${monthlyBudget - monthlyExpenses >= 0 ? formatMoney(monthlyBudget - monthlyExpenses) + ' left' : 'over budget'}
                    </span>
                </div>
            </div>
        `;
    }
    
    // Category breakdown ✅ CURRENCY FIX
    const categoryTotals = {};
    transactions.forEach(t => {
        if (t.date.substring(0, 7) === currentMonth && t.type === 'expense') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
    });
    
    if (Object.keys(categoryTotals).length === 0) {
        categoryBreakdown.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <div class="empty-text">No expenses yet</div>
            </div>
        `;
    } else {
        categoryBreakdown.innerHTML = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--md-sys-color-outline);">
                    <span>${getCategoryEmoji(cat)} ${cat}</span>
                    <strong class="negative">${formatMoney(amount)}</strong>
                </div>
            `).join('');
    }
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
// Category emoji mapping
function getCategoryEmoji(category) {
    const emojis = {
        'food': '🍕', 'transport': '🚗', 'shopping': '🛍️', 'utilities': '💡',
        'health': '🏥', 'entertainment': '🎬', 'education': '📚', 'other': '📌',
        'salary': '💼', 'freelance': '💻', 'investment': '📈', 'bonus': '🎁', 'other-income': '➕'
    };
    return emojis[category] || '📌';
}
// LocalStorage functions
function saveToLocalStorage() {
    const data = { transactions, monthlyBudget };
    localStorage.setItem('spendingTrackerData', JSON.stringify(data));
}
function loadFromLocalStorage() {
    const data = localStorage.getItem('spendingTrackerData');
    if (data) {
        const parsed = JSON.parse(data);
        transactions = parsed.transactions || [];
        monthlyBudget = parsed.monthlyBudget || 0;
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
// Export data as PDF
function exportDataAsPDF() {
    let content = 'SPENDING TRACKER REPORT\n';
    content += '='.repeat(50) + '\n\n';
    content += `Generated: ${new Date().toLocaleDateString('en-IN')}\n\n`;
    
    content += 'SUMMARY\n';
    content += '-'.repeat(50) + '\n';
    
    let totalIncome = 0, totalExpenses = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpenses += t.amount;
    });
    
    content += `Total Income: ₹${totalIncome.toFixed(2)}\n`;
    content += `Total Expenses: ₹${totalExpenses.toFixed(2)}\n`;
    content += `Balance: ₹${(totalIncome - totalExpenses).toFixed(2)}\n`;
    content += `Monthly Budget: ₹${monthlyBudget.toFixed(2)}\n\n`;
    
    content += 'ALL TRANSACTIONS\n';
    content += '-'.repeat(50) + '\n';
    transactions.slice().reverse().forEach(t => {
        content += `${new Date(t.date).toLocaleDateString('en-IN')} | ${t.category} | ${t.description} | ${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spending-tracker-${new Date().toISOString().split('T')[0]}.pdf.txt`;
    link.click();
    URL.revokeObjectURL(url);
    // alert('📄 Report downloaded as PDF!');
    showToast('📄 Report downloaded as PDF!');
}
// Export data as Excel
function exportDataAsExcel() {
    let csv = 'Date,Category,Description,Type,Amount\n';
    
    transactions.slice().reverse().forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-IN');
        const amount = t.type === 'income' ? t.amount : -t.amount;
        csv += `${date},"${t.category}","${t.description}","${t.type}",${amount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spending-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    // alert('📊 Data exported as Excel!');
    showToast('📊 Data exported as Excel!');
}
async function clearAllData() {
    const confirmed = await customConfirm('⚠️ Are you sure? This will delete ALL transactions and cannot be undone.');
    
    if (confirmed) {
        transactions = [];
        monthlyBudget = 0;
        saveToLocalStorage();
        updateDashboard();
        updateBudgetView();
        
        if (firebaseReady) {
            db.collection('transactions').get().then(snapshot => {
                snapshot.forEach(doc => doc.ref.delete());
            });
        }
        
        showToast('All data has been cleared successfully!', 'success', 4000);
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


// 🔥 YAHAN SE PURI JAVASCRIPT COPY KARO (index.html ke <script> tag se)
/*
const defaultCategory = 'expense';
let currentType = 'expense';
let transactions = [];
let monthlyBudget = 0;
let isSyncingToFirebase = false;

// Load data on startup
window.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  loadFromLocalStorage();
  updateDashboard();
  setFilterMonth();
});

// Baaki saare functions - setDefaultDate, switchTab, addTransaction, etc.
*/
