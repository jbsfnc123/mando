document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM (banyak tambahan baru) ---
    const notificationContainer = document.getElementById('notification-container');
    const views = document.querySelectorAll('.view');
    const dockItems = document.querySelectorAll('.dock-item');
    // ... Elemen DOM lama ...
    const planIncomeForm = document.getElementById('plan-income-form'), planExpenseForm = document.getElementById('plan-expense-form'), planIncomeList = document.getElementById('plan-income-list'), planExpenseList = document.getElementById('plan-expense-list');
    
    // --- BARU: Elemen untuk fitur-fitur baru ---
    const transactionDateInput = document.getElementById('transaction-date');
    const exportBtn = document.getElementById('export-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const donateBtn = document.getElementById('donate-btn');
    const donationModal = document.getElementById('donation-modal');
    const modalCloseBtn = donationModal.querySelector('.modal-close');

    // --- State & Local Storage ---
    // Fungsi untuk mendapatkan state awal
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

    // ... Fungsi lama (formatCurrency, showNotification) tetap sama ...
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


    // --- Fungsi Render (tidak ada perubahan besar, hanya render tanggal) ---
    // ... Fungsi renderDashboard, renderPlanning, renderCategories, dll dari sebelumnya ...
    const renderAll = () => {
        saveData();
        // ... panggil semua fungsi render ...
    };


    // --- Logika Inti Aplikasi ---
    // (Semua logika dari jawaban sebelumnya ditaruh di sini)
    // Saya akan menulis ulang dari awal untuk kejelasan dan menyisipkan logika baru
    
    // --- Fungsi render lengkap ---
    const renderDashboard = () => { /* ... kode renderDashboard dari sebelumnya ... */ };
    const renderPlanning = () => { /* ... kode renderPlanning dari sebelumnya ... */ };
    const renderTransactions = () => {
        transactionTableBody.innerHTML = '';
        [...state.transactions].reverse().forEach((t, index) => {
            const originalIndex = state.transactions.length - 1 - index;
            const row = document.createElement('tr');
            // MODIFIKASI: Menampilkan tanggal dari data transaksi
            row.innerHTML = `<td>${new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td><td class="${t.type}-text">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td><td>${t.category}</td><td>${t.description}</td><td>${formatCurrency(t.amount)}</td><td><button data-index="${originalIndex}">&times;</button></td>`;
            transactionTableBody.appendChild(row);
        });
    };
    const populateDropdown = (selectElement, categories) => { /* ... kode populateDropdown dari sebelumnya ... */ };
    const renderCategories = () => { /* ... kode renderCategories dari sebelumnya ... */ };
    const updateRealizationCategoryDropdown = () => { /* ... kode updateRealizationCategoryDropdown dari sebelumnya ... */ };

    // --- RENDER ALL UTAMA ---
    // (Seluruh fungsi render dipanggil dari sini)
    // ... Kode renderAll yang memanggil semua fungsi render di atas ...

    
    // --- EVENT LISTENERS ---

    // Event Listener Lama (Navigasi, Perencanaan, dll)
    // ... Semua event listener dari jawaban sebelumnya ...
    

    // --- MODIFIKASI: Event Listener Form Transaksi ---
    document.getElementById('transaction-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const dateValue = transactionDateInput.value;
        const newTransaction = { 
            id: Date.now(), 
            // Gunakan tanggal dari input, atau tanggal hari ini jika kosong
            date: dateValue ? new Date(dateValue).toISOString() : new Date().toISOString(), 
            type: document.getElementById('transaction-type').value, 
            category: document.getElementById('transaction-category').value, 
            description: document.getElementById('transaction-description').value, 
            amount: parseFloat(document.getElementById('transaction-amount').value),
        };
        state.transactions.push(newTransaction);
        e.target.reset();
        // Set input tanggal ke hari ini lagi setelah reset
        transactionDateInput.valueAsDate = new Date();
        renderAll();
    });

    // --- BARU: Event Listener untuk Fitur Baru ---

    // 1. Export ke CSV (Excel)
    exportBtn.addEventListener('click', () => {
        if (state.transactions.length === 0) {
            showNotification('Tidak ada data transaksi untuk diexport.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = ["Tanggal", "Jenis", "Kategori", "Deskripsi", "Jumlah"];
        csvContent += headers.join(",") + "\r\n";

        state.transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('id-ID');
            // Menangani koma di dalam deskripsi dengan mengapitnya dalam tanda kutip
            const description = `"${t.description}"`;
            const row = [date, t.type, t.category, description, t.amount];
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `laporan_keuangan_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Data berhasil diexport!', 'success');
    });

    // 2. Bersihkan Semua Data
    clearDataBtn.addEventListener('click', () => {
        const isConfirmed = confirm("APAKAH ANDA YAKIN?\nSemua data perencanaan dan transaksi akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.");
        if (isConfirmed) {
            state = getInitialState(); // Reset state ke kondisi awal
            notifiedCategories.clear(); // Hapus juga cache notifikasi
            renderAll();
            showNotification('Semua data telah berhasil dibersihkan.', 'success');
        }
    });

    // 3. Buka dan Tutup Modal Donasi
    donateBtn.addEventListener('click', () => {
        donationModal.classList.add('show');
    });

    modalCloseBtn.addEventListener('click', () => {
        donationModal.classList.remove('show');
    });

    donationModal.addEventListener('click', (e) => {
        // Jika yang diklik adalah area overlay (latar belakang), bukan konten modal
        if (e.target === donationModal) {
            donationModal.classList.remove('show');
        }
    });

    // --- Inisialisasi ---
    const initializeApp = () => {
        // Set nilai default input tanggal ke hari ini saat aplikasi dimuat
        transactionDateInput.valueAsDate = new Date();
        renderAll(); // panggil renderAll yang sudah berisi semua fungsi render
    };

    // Panggil semua fungsi yang diperlukan saat aplikasi siap
    initializeApp();

    // -- Salin semua fungsi dan event listener yang sudah benar dari jawaban sebelumnya ke sini --
    // Ini termasuk: renderDashboard, renderPlanning, renderCategories, populateDropdown,
    // event listener untuk dock, form perencanaan, form kategori, dll.
    // Kode di bawah ini adalah salinan yang sudah benar untuk memastikan kelengkapan.
    
    // Fungsi Render lengkap disalin kembali untuk memastikan tidak ada yang terlewat
    const renderAllComplete = () => {
        const totalPlannedIncome = Object.values(state.plannedIncomes).reduce((sum, amount) => sum + amount, 0);
        const totalPlannedExpense = Object.values(state.plannedExpenses).reduce((sum, amount) => sum + amount, 0);
        const totalActualIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalActualExpense = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalActualIncome - totalActualExpense;
        const expenseRatio = totalPlannedExpense > 0 ? (totalActualExpense / totalPlannedExpense) * 100 : 0;
        const dashboardElements = {
            plannedIncomeEl: document.getElementById('planned-income'),
            actualIncomeEl: document.getElementById('actual-income'),
            plannedExpenseEl: document.getElementById('planned-expense'),
            actualExpenseEl: document.getElementById('actual-expense'),
            currentBalanceEl: document.getElementById('current-balance'),
            expenseRatioEl: document.getElementById('expense-ratio'),
            expenseProgressBar: document.getElementById('expense-progress-bar'),
            categoryRatiosContainer: document.getElementById('category-ratios-container')
        };
        dashboardElements.plannedIncomeEl.textContent = formatCurrency(totalPlannedIncome);
        dashboardElements.actualIncomeEl.textContent = formatCurrency(totalActualIncome);
        dashboardElements.plannedExpenseEl.textContent = formatCurrency(totalPlannedExpense);
        dashboardElements.actualExpenseEl.textContent = formatCurrency(totalActualExpense);
        dashboardElements.currentBalanceEl.textContent = formatCurrency(currentBalance);
        dashboardElements.expenseRatioEl.textContent = `${expenseRatio.toFixed(1)}%`;
        dashboardElements.expenseProgressBar.style.width = `${Math.min(expenseRatio, 100)}%`;
        dashboardElements.expenseProgressBar.style.backgroundColor = expenseRatio > 100 ? 'var(--red-color)' : expenseRatio > 80 ? 'var(--orange-color)' : 'var(--green-color)';
        dashboardElements.categoryRatiosContainer.innerHTML = '<h3 class="section-title">Rincian Rasio Pengeluaran</h3>';
        if (Object.keys(state.plannedExpenses).length === 0) dashboardElements.categoryRatiosContainer.innerHTML += '<p style="color: var(--text-secondary);">Belum ada rencana pengeluaran.</p>';
        for (const category in state.plannedExpenses) {
            const planned = state.plannedExpenses[category];
            const actual = state.transactions.filter(t => t.type === 'expense' && t.category === category).reduce((sum, t) => sum + t.amount, 0);
            const ratio = planned > 0 ? (actual / planned) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'category-ratio-item';
            item.innerHTML = `<div class="header"><span class="name">${category}</span><span class="ratio" style="color: ${ratio > 100 ? 'var(--red-color)' : ratio > 80 ? 'var(--orange-color)' : 'var(--text-primary)'}">${ratio.toFixed(1)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${Math.min(ratio, 100)}%; background-color: ${ratio > 100 ? 'var(--red-color)' : ratio > 80 ? 'var(--orange-color)' : 'var(--accent-color)'};"></div></div><div class="footer">${formatCurrency(actual)} / ${formatCurrency(planned)}</div>`;
            dashboardElements.categoryRatiosContainer.appendChild(item);
            if (ratio >= 80 && !notifiedCategories.has(category)) {
                showNotification(`Pengeluaran <b>${category}</b> sudah mencapai ${ratio.toFixed(0)}% dari rencana!`);
                notifiedCategories.add(category);
            }
        }
        planIncomeList.innerHTML = '';
        for(const category in state.plannedIncomes) planIncomeList.innerHTML += `<li><span>${category} - ${formatCurrency(state.plannedIncomes[category])}</span><button data-category="${category}" data-type="income">&times;</button></li>`;
        planExpenseList.innerHTML = '';
        for(const category in state.plannedExpenses) planExpenseList.innerHTML += `<li><span>${category} - ${formatCurrency(state.plannedExpenses[category])}</span><button data-category="${category}" data-type="expense">&times;</button></li>`;
        renderTransactions();
        const incomeCategoryList = document.getElementById('income-category-list'), expenseCategoryList = document.getElementById('expense-category-list');
        const planIncomeCategory = document.getElementById('plan-income-category'), planExpenseCategory = document.getElementById('plan-expense-category');
        const transactionCategory = document.getElementById('transaction-category');
        incomeCategoryList.innerHTML = ''; state.categories.income.forEach((cat, index) => incomeCategoryList.innerHTML += `<li><span>${cat}</span> <button data-index="${index}" data-type="income">&times;</button></li>`);
        expenseCategoryList.innerHTML = ''; state.categories.expense.forEach((cat, index) => expenseCategoryList.innerHTML += `<li><span>${cat}</span> <button data-index="${index}" data-type="expense">&times;</button></li>`);
        const populate = (el, cats) => { el.innerHTML = ''; cats.forEach(c => el.innerHTML += `<option value="${c}">${c}</option>`); };
        populate(planIncomeCategory, state.categories.income);
        populate(planExpenseCategory, state.categories.expense);
        populate(transactionCategory, state.categories[document.getElementById('transaction-type').value]);
        saveData();
    };
    renderAll = renderAllComplete;
    // Event listeners yang sudah benar
    dockItems.forEach(item => item.addEventListener('click', () => { views.forEach(v => v.classList.remove('active')); document.getElementById(item.getAttribute('data-view')).classList.add('active'); }));
    planIncomeForm.addEventListener('submit', (e) => { e.preventDefault(); const c = e.target.querySelector('select').value, a = e.target.querySelector('input'); if (c && a.value > 0) { state.plannedIncomes[c] = parseFloat(a.value); a.value = ''; renderAll(); } });
    planExpenseForm.addEventListener('submit', (e) => { e.preventDefault(); const c = e.target.querySelector('select').value, a = e.target.querySelector('input'); if (c && a.value > 0) { state.plannedExpenses[c] = parseFloat(a.value); a.value = ''; renderAll(); } });
    document.getElementById('planning-view').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const t = e.target.dataset.type, c = e.target.dataset.category; if(t==='income') delete state.plannedIncomes[c]; if(t==='expense') { delete state.plannedExpenses[c]; notifiedCategories.delete(c); } renderAll(); } });
    document.getElementById('transaction-type').addEventListener('change', () => {const transactionCategory = document.getElementById('transaction-category'); const populate = (el, cats) => { el.innerHTML = ''; cats.forEach(c => el.innerHTML += `<option value="${c}">${c}</option>`); }; populate(transactionCategory, state.categories[document.getElementById('transaction-type').value]);});
    document.getElementById('transaction-table tbody').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { state.transactions.splice(parseInt(e.target.dataset.index), 1); renderAll(); } });
    document.getElementById('income-category-form').addEventListener('submit', e => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value && !state.categories.income.includes(i.value)) { state.categories.income.push(i.value.trim()); i.value = ''; renderAll(); } });
    document.getElementById('expense-category-form').addEventListener('submit', e => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value && !state.categories.expense.includes(i.value)) { state.categories.expense.push(i.value.trim()); i.value = ''; renderAll(); } });
    document.getElementById('settings-view').addEventListener('click', (e) => { if (e.target.matches('ul button')) { const t = e.target.dataset.type, i = e.target.dataset.index; state.categories[t].splice(i, 1); renderAll(); } });
    initializeApp();
});
