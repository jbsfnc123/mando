document.addEventListener('DOMContentLoaded', () => {
    // === ELEMEN DOM ===
    // Kontainer & Navigasi
    const views = document.querySelectorAll('.view');
    const dockItems = document.querySelectorAll('.dock-item');
    const notificationContainer = document.getElementById('notification-container');
    
    // Fitur Baru
    const exportBtn = document.getElementById('export-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const donateBtn = document.getElementById('donate-btn');
    const donationModal = document.getElementById('donation-modal');
    const modalCloseBtn = donationModal.querySelector('.modal-close');
    
    // Form & List
    const planIncomeForm = document.getElementById('plan-income-form');
    const planExpenseForm = document.getElementById('plan-expense-form');
    const planIncomeList = document.getElementById('plan-income-list');
    const planExpenseList = document.getElementById('plan-expense-list');
    const transactionForm = document.getElementById('transaction-form');
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionTableBody = document.querySelector('#transaction-table tbody');
    const incomeCategoryForm = document.getElementById('income-category-form');
    const expenseCategoryForm = document.getElementById('expense-category-form');

    // === STATE MANAGEMENT ===
    const getInitialState = () => ({
        plannedIncomes: {},
        plannedExpenses: {},
        transactions: [],
        categories: {
            income: ['Gaji', 'Bonus', 'Lain-lain'],
            expense: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Lain-lain']
        }
    });

    let state = JSON.parse(localStorage.getItem('financialState')) || getInitialState();
    let notifiedCategories = new Set();

    const saveData = () => {
        localStorage.setItem('financialState', JSON.stringify(state));
    };

    // === FUNGSI HELPERS ===
    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const showNotification = (message, type = 'warning') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        const iconClass = type === 'success' ? 'fa-solid fa-check-circle' : 'fa-solid fa-triangle-exclamation';
        notification.innerHTML = `<i class="${iconClass}"></i><p>${message}</p>`;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => notification.classList.remove('show'), 5000);
        setTimeout(() => notification.remove(), 5500);
    };

    const populateDropdown = (selectElement, categories) => {
        selectElement.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            selectElement.appendChild(option);
        });
    };

    // === FUNGSI RENDER (yang dipanggil oleh renderAll) ===
    const renderDashboard = () => {
        const totalPlannedIncome = Object.values(state.plannedIncomes).reduce((s, a) => s + a, 0);
        const totalPlannedExpense = Object.values(state.plannedExpenses).reduce((s, a) => s + a, 0);
        const totalActualIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalActualExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const expenseRatio = totalPlannedExpense > 0 ? (totalActualExpense / totalPlannedExpense) * 100 : 0;
        
        document.getElementById('planned-income').textContent = formatCurrency(totalPlannedIncome);
        document.getElementById('actual-income').textContent = formatCurrency(totalActualIncome);
        document.getElementById('planned-expense').textContent = formatCurrency(totalPlannedExpense);
        document.getElementById('actual-expense').textContent = formatCurrency(totalActualExpense);
        document.getElementById('current-balance').textContent = formatCurrency(totalActualIncome - totalActualExpense);
        document.getElementById('expense-ratio').textContent = `${expenseRatio.toFixed(1)}%`;
        const progressBar = document.getElementById('expense-progress-bar');
        progressBar.style.width = `${Math.min(expenseRatio, 100)}%`;
        progressBar.style.backgroundColor = expenseRatio > 100 ? 'var(--red-color)' : expenseRatio > 80 ? 'var(--orange-color)' : 'var(--green-color)';

        const categoryContainer = document.getElementById('category-ratios-container');
        categoryContainer.innerHTML = '<h3 class="section-title">Rincian Rasio Pengeluaran</h3>';
        if (Object.keys(state.plannedExpenses).length === 0) {
            categoryContainer.innerHTML += '<p style="color: var(--text-secondary);">Belum ada rencana pengeluaran.</p>';
            return;
        }
        for (const category in state.plannedExpenses) {
            const planned = state.plannedExpenses[category];
            const actual = state.transactions.filter(t => t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0);
            const ratio = planned > 0 ? (actual / planned) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'category-ratio-item';
            const ratioColor = ratio > 100 ? 'var(--red-color)' : ratio > 80 ? 'var(--orange-color)' : 'var(--text-primary)';
            item.innerHTML = `<div class="header"><span class="name">${category}</span><span class="ratio" style="color: ${ratioColor}">${ratio.toFixed(1)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${Math.min(ratio, 100)}%; background-color: ${ratioColor};"></div></div><div class="footer">${formatCurrency(actual)} / ${formatCurrency(planned)}</div>`;
            categoryContainer.appendChild(item);
            if (ratio >= 80 && !notifiedCategories.has(category)) {
                showNotification(`Pengeluaran <b>${category}</b> sudah mencapai ${ratio.toFixed(0)}% dari rencana!`);
                notifiedCategories.add(category);
            }
        }
    };
    
    const renderPlanning = () => {
        const renderList = (listEl, plans) => {
            listEl.innerHTML = '';
            for (const category in plans) {
                listEl.innerHTML += `<li><span>${category} - ${formatCurrency(plans[category])}</span><button data-category="${category}" data-type="${listEl === planIncomeList ? 'income' : 'expense'}">&times;</button></li>`;
            }
        };
        renderList(planIncomeList, state.plannedIncomes);
        renderList(planExpenseList, state.plannedExpenses);
    };

    const renderTransactions = () => {
        transactionTableBody.innerHTML = '';
        [...state.transactions].slice().reverse().forEach((t, index) => {
            const originalIndex = state.transactions.length - 1 - index;
            const row = document.createElement('tr');
            row.innerHTML = `<td>${new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td><td class="${t.type}-text">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td><td>${t.category}</td><td>${t.description}</td><td>${formatCurrency(t.amount)}</td><td><button data-index="${originalIndex}">&times;</button></td>`;
            transactionTableBody.appendChild(row);
        });
    };

    const renderCategories = () => {
        const renderCatList = (listEl, categories, type) => {
            listEl.innerHTML = '';
            categories.forEach((cat, index) => {
                listEl.innerHTML += `<li><span>${cat}</span><button data-index="${index}" data-type="${type}">&times;</button></li>`;
            });
        };
        renderCatList(document.getElementById('income-category-list'), state.categories.income, 'income');
        renderCatList(document.getElementById('expense-category-list'), state.categories.expense, 'expense');
        
        populateDropdown(document.getElementById('plan-income-category'), state.categories.income);
        populateDropdown(document.getElementById('plan-expense-category'), state.categories.expense);
        populateDropdown(document.getElementById('transaction-category'), state.categories[document.getElementById('transaction-type').value]);
    };

    // === FUNGSI UTAMA RENDER ALL ===
    const renderAll = () => {
        saveData();
        renderDashboard();
        renderPlanning();
        renderTransactions();
        renderCategories();
    };

    // === EVENT LISTENERS ===
    // Navigasi Dock
    dockItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.id === 'donate-btn') return; // Ditangani oleh listener donasi
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(item.getAttribute('data-view')).classList.add('active');
        });
    });

    // Modal Donasi
    donateBtn.addEventListener('click', () => donationModal.classList.add('show'));
    modalCloseBtn.addEventListener('click', () => donationModal.classList.remove('show'));
    donationModal.addEventListener('click', (e) => { if (e.target === donationModal) donationModal.classList.remove('show'); });

    // Fitur Pengaturan
    clearDataBtn.addEventListener('click', () => {
        if (confirm("APAKAH ANDA YAKIN?\nSemua data perencanaan dan transaksi akan dihapus permanen.")) {
            state = getInitialState();
            notifiedCategories.clear();
            renderAll();
            showNotification('Semua data telah dibersihkan.', 'success');
        }
    });

    exportBtn.addEventListener('click', () => {
        if (state.transactions.length === 0) {
            showNotification('Tidak ada data untuk diexport.');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Tanggal,Jenis,Kategori,Deskripsi,Jumlah\r\n";
        state.transactions.forEach(t => {
            const row = [ new Date(t.date).toLocaleDateString('id-ID'), t.type, t.category, `"${t.description}"`, t.amount ];
            csvContent += row.join(",") + "\r\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `laporan_keuangan_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Form-form
    const handlePlanFormSubmit = (form, planType) => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const category = e.target.querySelector('select').value;
            const amountInput = e.target.querySelector('input[type="number"]');
            const amount = parseFloat(amountInput.value);
            if (category && amount > 0) {
                state[planType][category] = amount;
                amountInput.value = '';
                renderAll();
            }
        });
    };
    handlePlanFormSubmit(planIncomeForm, 'plannedIncomes');
    handlePlanFormSubmit(planExpenseForm, 'plannedExpenses');
    
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateValue = transactionDateInput.value;
        const newTransaction = { 
            id: Date.now(), 
            date: dateValue ? new Date(dateValue).toISOString() : new Date().toISOString(), 
            type: document.getElementById('transaction-type').value, 
            category: document.getElementById('transaction-category').value, 
            description: document.getElementById('transaction-description').value, 
            amount: parseFloat(document.getElementById('transaction-amount').value),
        };
        state.transactions.push(newTransaction);
        e.target.reset();
        transactionDateInput.valueAsDate = new Date();
        renderAll();
    });

    const handleCategoryFormSubmit = (form, catType) => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const newCat = input.value.trim();
            if (newCat && !state.categories[catType].includes(newCat)) {
                state.categories[catType].push(newCat);
                input.value = '';
                renderAll();
            }
        });
    };
    handleCategoryFormSubmit(incomeCategoryForm, 'income');
    handleCategoryFormSubmit(expenseCategoryForm, 'expense');

    // Event Delegation untuk Hapus Item
    document.getElementById('planning-view').addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            const type = e.target.dataset.type === 'income' ? 'plannedIncomes' : 'plannedExpenses';
            const category = e.target.dataset.category;
            delete state[type][category];
            if (type === 'plannedExpenses') notifiedCategories.delete(category);
            renderAll();
        }
    });

    transactionTableBody.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            state.transactions.splice(parseInt(e.target.dataset.index), 1);
            renderAll();
        }
    });

    document.getElementById('settings-view').addEventListener('click', e => {
        if (e.target.matches('ul button')) {
            state.categories[e.target.dataset.type].splice(e.target.dataset.index, 1);
            renderAll();
        }
    });

    document.getElementById('transaction-type').addEventListener('change', renderCategories);


    // === INISIALISASI APLIKASI ===
    const initializeApp = () => {
        transactionDateInput.valueAsDate = new Date();
        renderAll();
    };

    initializeApp();
});
