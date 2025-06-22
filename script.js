document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM ---
    const notificationContainer = document.getElementById('notification-container');
    const views = document.querySelectorAll('.view');
    const dockItems = document.querySelectorAll('.dock-item');
    // Dashboard
    const plannedIncomeEl = document.getElementById('planned-income'), actualIncomeEl = document.getElementById('actual-income'), plannedExpenseEl = document.getElementById('planned-expense'), actualExpenseEl = document.getElementById('actual-expense'), expenseRatioEl = document.getElementById('expense-ratio'), expenseProgressBar = document.getElementById('expense-progress-bar'), currentBalanceEl = document.getElementById('current-balance'), categoryRatiosContainer = document.getElementById('category-ratios-container');
    // Perencanaan
    const planIncomeForm = document.getElementById('plan-income-form'), planExpenseForm = document.getElementById('plan-expense-form'), planIncomeList = document.getElementById('plan-income-list'), planExpenseList = document.getElementById('plan-expense-list'), planIncomeCategory = document.getElementById('plan-income-category'), planExpenseCategory = document.getElementById('plan-expense-category');
    // Realisasi
    const transactionForm = document.getElementById('transaction-form'), transactionType = document.getElementById('transaction-type'), transactionCategory = document.getElementById('transaction-category'), transactionTableBody = document.querySelector('#transaction-table tbody');
    // Pengaturan Kategori
    const incomeCategoryForm = document.getElementById('income-category-form'), expenseCategoryForm = document.getElementById('expense-category-form'), incomeCategoryList = document.getElementById('income-category-list'), expenseCategoryList = document.getElementById('expense-category-list');
    
    // --- State & Local Storage ---
    let state = {
        plannedIncomes: JSON.parse(localStorage.getItem('plannedIncomes')) || {},
        plannedExpenses: JSON.parse(localStorage.getItem('plannedExpenses')) || {},
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        categories: JSON.parse(localStorage.getItem('categories')) || {
            income: ['Gaji', 'Bonus'],
            expense: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan']
        }
    };
    
    let notifiedCategories = new Set();

    const saveData = () => {
        localStorage.setItem('plannedIncomes', JSON.stringify(state.plannedIncomes));
        localStorage.setItem('plannedExpenses', JSON.stringify(state.plannedExpenses));
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('categories', JSON.stringify(state.categories));
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const showNotification = (message) => {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p>${message}</p>`;
        notificationContainer.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => notification.classList.remove('show'), 5000);
        setTimeout(() => notification.remove(), 5500);
    };

    const renderDashboard = () => {
        const totalPlannedIncome = Object.values(state.plannedIncomes).reduce((sum, amount) => sum + amount, 0);
        const totalPlannedExpense = Object.values(state.plannedExpenses).reduce((sum, amount) => sum + amount, 0);
        const totalActualIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalActualExpense = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalActualIncome - totalActualExpense;
        const expenseRatio = totalPlannedExpense > 0 ? (totalActualExpense / totalPlannedExpense) * 100 : 0;

        plannedIncomeEl.textContent = formatCurrency(totalPlannedIncome);
        actualIncomeEl.textContent = formatCurrency(totalActualIncome);
        plannedExpenseEl.textContent = formatCurrency(totalPlannedExpense);
        actualExpenseEl.textContent = formatCurrency(totalActualExpense);
        currentBalanceEl.textContent = formatCurrency(currentBalance);
        expenseRatioEl.textContent = `${expenseRatio.toFixed(1)}%`;
        expenseProgressBar.style.width = `${Math.min(expenseRatio, 100)}%`;
        expenseProgressBar.style.backgroundColor = expenseRatio > 100 ? 'var(--red-color)' : expenseRatio > 80 ? 'var(--orange-color)' : 'var(--green-color)';
        
        categoryRatiosContainer.innerHTML = '<h3 class="section-title">Rincian Rasio Pengeluaran</h3>';
        if (Object.keys(state.plannedExpenses).length === 0) {
            categoryRatiosContainer.innerHTML += '<p style="color: var(--text-secondary);">Belum ada rencana pengeluaran yang dibuat.</p>';
        }

        for (const category in state.plannedExpenses) {
            const planned = state.plannedExpenses[category];
            const actual = state.transactions
                .filter(t => t.type === 'expense' && t.category === category)
                .reduce((sum, t) => sum + t.amount, 0);
            
            const ratio = planned > 0 ? (actual / planned) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'category-ratio-item';
            item.innerHTML = `
                <div class="header">
                    <span class="name">${category}</span>
                    <span class="ratio" style="color: ${ratio > 100 ? 'var(--red-color)' : ratio > 80 ? 'var(--orange-color)' : 'var(--text-primary)'}">${ratio.toFixed(1)}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${Math.min(ratio, 100)}%; background-color: ${ratio > 100 ? 'var(--red-color)' : ratio > 80 ? 'var(--orange-color)' : 'var(--accent-color)'};"></div>
                </div>
                <div class="footer">${formatCurrency(actual)} / ${formatCurrency(planned)}</div>
            `;
            categoryRatiosContainer.appendChild(item);

            if (ratio >= 80 && !notifiedCategories.has(category)) {
                showNotification(`Pengeluaran <b>${category}</b> sudah mencapai ${ratio.toFixed(0)}% dari rencana!`);
                notifiedCategories.add(category);
            }
        }
    };

    const renderPlanning = () => {
        planIncomeList.innerHTML = '';
        for(const category in state.plannedIncomes){
            const li = document.createElement('li');
            li.innerHTML = `<span>${category} - ${formatCurrency(state.plannedIncomes[category])}</span><button data-category="${category}" data-type="income">&times;</button>`;
            planIncomeList.appendChild(li);
        }

        planExpenseList.innerHTML = '';
        for(const category in state.plannedExpenses){
            const li = document.createElement('li');
            li.innerHTML = `<span>${category} - ${formatCurrency(state.plannedExpenses[category])}</span><button data-category="${category}" data-type="expense">&times;</button>`;
            planExpenseList.appendChild(li);
        }
    };
    
    const renderTransactions = () => {
        transactionTableBody.innerHTML = '';
        [...state.transactions].reverse().forEach((t, index) => {
            const originalIndex = state.transactions.length - 1 - index;
            const row = document.createElement('tr');
            row.innerHTML = `<td>${new Date(t.date).toLocaleDateString('id-ID')}</td><td class="${t.type}-text">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td><td>${t.category}</td><td>${t.description}</td><td>${formatCurrency(t.amount)}</td><td><button data-index="${originalIndex}">&times;</button></td>`;
            transactionTableBody.appendChild(row);
        });
    };

    const populateDropdown = (selectElement, categories) => {
        selectElement.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat; option.textContent = cat;
            selectElement.appendChild(option);
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
        
        populateDropdown(planIncomeCategory, state.categories.income);
        populateDropdown(planExpenseCategory, state.categories.expense);
        updateRealizationCategoryDropdown();
    };

    const updateRealizationCategoryDropdown = () => {
        const currentType = transactionType.value;
        populateDropdown(transactionCategory, state.categories[currentType]);
    };

    const renderAll = () => {
        saveData();
        renderDashboard();
        renderPlanning();
        renderTransactions();
        renderCategories();
    };

    // --- Event Listeners ---
    dockItems.forEach(item => item.addEventListener('click', () => {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(item.getAttribute('data-view')).classList.add('active');
    }));

    // --- PERBAIKAN FINAL ---
    // Logika diubah untuk membaca elemen form secara langsung dari event.
    planIncomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const categorySelect = e.target.querySelector('select');
        const amountInput = e.target.querySelector('input[type="number"]');
        
        const category = categorySelect.value;
        const amount = parseFloat(amountInput.value);

        if (category && amount > 0) {
            state.plannedIncomes[category] = amount;
            amountInput.value = ''; // Hanya kosongkan input jumlah
            renderAll();
        }
    });

    // --- PERBAIKAN FINAL ---
    // Logika diubah untuk membaca elemen form secara langsung dari event.
    planExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const categorySelect = e.target.querySelector('select');
        const amountInput = e.target.querySelector('input[type="number"]');

        const category = categorySelect.value;
        const amount = parseFloat(amountInput.value);

        if (category && amount > 0) {
            state.plannedExpenses[category] = amount;
            amountInput.value = ''; // Hanya kosongkan input jumlah
            renderAll();
        }
    });

    document.getElementById('planning-view').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const type = e.target.dataset.type;
            const category = e.target.dataset.category;
            if(type === 'income') delete state.plannedIncomes[category];
            if(type === 'expense') {
                delete state.plannedExpenses[category];
                notifiedCategories.delete(category);
            }
            renderAll();
        }
    });
    
    transactionType.addEventListener('change', updateRealizationCategoryDropdown);

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTransaction = { id: Date.now(), date: new Date().toISOString(), type: document.getElementById('transaction-type').value, category: document.getElementById('transaction-category').value, description: document.getElementById('transaction-description').value, amount: parseFloat(document.getElementById('transaction-amount').value) };
        state.transactions.push(newTransaction);
        transactionForm.reset();
        renderAll();
    });

    transactionTableBody.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.transactions.splice(parseInt(e.target.dataset.index), 1);
            renderAll();
        }
    });

    const handleAddCategory = (form, type) => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const newCat = e.target.children[0].value.trim();
            if (newCat && !state.categories[type].includes(newCat)) {
                state.categories[type].push(newCat);
                e.target.reset();
                renderAll();
            }
        });
    };
    handleAddCategory(incomeCategoryForm, 'income');
    handleAddCategory(expenseCategoryForm, 'expense');

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
