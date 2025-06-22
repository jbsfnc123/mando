document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM ---
    const views = document.querySelectorAll('.view');
    const dockItems = document.querySelectorAll('.dock-item');

    // Dashboard
    const plannedIncomeEl = document.getElementById('planned-income');
    const actualIncomeEl = document.getElementById('actual-income');
    const plannedExpenseEl = document.getElementById('planned-expense');
    const actualExpenseEl = document.getElementById('actual-expense');
    const expenseRatioEl = document.getElementById('expense-ratio');
    const expenseProgressBar = document.getElementById('expense-progress-bar');
    const currentBalanceEl = document.getElementById('current-balance');

    // Perencanaan
    const planIncomeForm = document.getElementById('plan-income-form');
    const planExpenseForm = document.getElementById('plan-expense-form');
    const planIncomeList = document.getElementById('plan-income-list');
    const planExpenseList = document.getElementById('plan-expense-list');

    // Realisasi
    const transactionForm = document.getElementById('transaction-form');
    const transactionType = document.getElementById('transaction-type');
    const transactionCategory = document.getElementById('transaction-category');
    const transactionTableBody = document.querySelector('#transaction-table tbody');

    // Pengaturan Kategori
    const incomeCategoryForm = document.getElementById('income-category-form');
    const expenseCategoryForm = document.getElementById('expense-category-form');
    const incomeCategoryList = document.getElementById('income-category-list');
    const expenseCategoryList = document.getElementById('expense-category-list');


    // --- State & Local Storage ---
    let state = {
        plannedIncomes: JSON.parse(localStorage.getItem('plannedIncomes')) || [],
        plannedExpenses: JSON.parse(localStorage.getItem('plannedExpenses')) || [],
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        categories: JSON.parse(localStorage.getItem('categories')) || {
            income: ['Gaji', 'Bonus'],
            expense: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan']
        }
    };

    const saveData = () => {
        localStorage.setItem('plannedIncomes', JSON.stringify(state.plannedIncomes));
        localStorage.setItem('plannedExpenses', JSON.stringify(state.plannedExpenses));
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('categories', JSON.stringify(state.categories));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    // --- Fungsi Render ---

    const renderDashboard = () => {
        const totalPlannedIncome = state.plannedIncomes.reduce((sum, item) => sum + item.amount, 0);
        const totalPlannedExpense = state.plannedExpenses.reduce((sum, item) => sum + item.amount, 0);

        const totalActualIncome = state.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalActualExpense = state.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentBalance = totalActualIncome - totalActualExpense;

        const expenseRatio = totalPlannedExpense > 0 ? (totalActualExpense / totalPlannedExpense) * 100 : 0;

        plannedIncomeEl.textContent = formatCurrency(totalPlannedIncome);
        actualIncomeEl.textContent = formatCurrency(totalActualIncome);
        plannedExpenseEl.textContent = formatCurrency(totalPlannedExpense);
        actualExpenseEl.textContent = formatCurrency(totalActualExpense);
        currentBalanceEl.textContent = formatCurrency(currentBalance);
        expenseRatioEl.textContent = `${expenseRatio.toFixed(1)}%`;
        
        expenseProgressBar.style.width = `${Math.min(expenseRatio, 100)}%`;
        if (expenseRatio > 100) {
            expenseProgressBar.style.backgroundColor = 'var(--red-color)';
        } else if (expenseRatio > 75) {
            expenseProgressBar.style.backgroundColor = 'var(--yellow-color)';
        } else {
            expenseProgressBar.style.backgroundColor = 'var(--green-color)';
        }
    };

    const renderPlanning = () => {
        planIncomeList.innerHTML = '';
        state.plannedIncomes.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name} - ${formatCurrency(item.amount)}</span>
                <button data-index="${index}" data-type="income">&times;</button>
            `;
            planIncomeList.appendChild(li);
        });

        planExpenseList.innerHTML = '';
        state.plannedExpenses.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name} - ${formatCurrency(item.amount)}</span>
                <button data-index="${index}" data-type="expense">&times;</button>
            `;
            planExpenseList.appendChild(li);
        });
    };
    
    const renderTransactions = () => {
        transactionTableBody.innerHTML = '';
        [...state.transactions].reverse().forEach((t, index) => {
            const originalIndex = state.transactions.length - 1 - index;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString('id-ID')}</td>
                <td class="${t.type}-text">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                <td>${t.category}</td>
                <td>${t.description}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td><button data-index="${originalIndex}">&times;</button></td>
            `;
            transactionTableBody.appendChild(row);
        });
    };

    const renderCategories = () => {
        incomeCategoryList.innerHTML = '';
        state.categories.income.forEach((cat, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${cat}</span> <button data-index="${index}" data-type="income">&times;</button>`;
            incomeCategoryList.appendChild(li);
        });

        expenseCategoryList.innerHTML = '';
        state.categories.expense.forEach((cat, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${cat}</span> <button data-index="${index}" data-type="expense">&times;</button>`;
            expenseCategoryList.appendChild(li);
        });
        updateCategoryDropdown();
    };

    const updateCategoryDropdown = () => {
        transactionCategory.innerHTML = '';
        const currentType = transactionType.value;
        const categories = state.categories[currentType];
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            transactionCategory.appendChild(option);
        });
    };

    const renderAll = () => {
        renderDashboard();
        renderPlanning();
        renderTransactions();
        renderCategories();
        saveData();
    };

    // --- Event Listeners ---
    
    // Navigasi Dock
    dockItems.forEach(item => {
        item.addEventListener('click', () => {
            views.forEach(view => view.classList.remove('active'));
            const viewId = item.getAttribute('data-view');
            document.getElementById(viewId).classList.add('active');
        });
    });

    // Form Perencanaan
    planIncomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.children[0].value;
        const amount = parseFloat(e.target.children[1].value);
        if (name && amount > 0) {
            state.plannedIncomes.push({ name, amount });
            e.target.reset();
            renderAll();
        }
    });

    planExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.children[0].value;
        const amount = parseFloat(e.target.children[1].value);
        if (name && amount > 0) {
            state.plannedExpenses.push({ name, amount });
            e.target.reset();
            renderAll();
        }
    });
    
    // Hapus item perencanaan
    document.getElementById('planning-view').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index);
            if(type === 'income') state.plannedIncomes.splice(index, 1);
            if(type === 'expense') state.plannedExpenses.splice(index, 1);
            renderAll();
        }
    });

    // Form Transaksi
    transactionType.addEventListener('change', updateCategoryDropdown);

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTransaction = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: document.getElementById('transaction-type').value,
            category: document.getElementById('transaction-category').value,
            description: document.getElementById('transaction-description').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
        };
        state.transactions.push(newTransaction);
        transactionForm.reset();
        renderAll();
    });

    // Hapus Transaksi
    transactionTableBody.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index);
            state.transactions.splice(index, 1);
            renderAll();
        }
    });

    // Form Kategori
    incomeCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newCat = e.target.children[0].value.trim();
        if (newCat && !state.categories.income.includes(newCat)) {
            state.categories.income.push(newCat);
            e.target.reset();
            renderAll();
        }
    });

    expenseCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newCat = e.target.children[0].value.trim();
        if (newCat && !state.categories.expense.includes(newCat)) {
            state.categories.expense.push(newCat);
            e.target.reset();
            renderAll();
        }
    });

    // Hapus Kategori
    document.getElementById('settings-view').addEventListener('click', (e) => {
         if (e.target.tagName === 'BUTTON') {
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index);
            state.categories[type].splice(index, 1);
            renderAll();
        }
    });

    // --- Inisialisasi ---
    renderAll();
});
