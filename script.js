document.addEventListener("DOMContentLoaded", () => {
    
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJulpWQwI2qu1Lji-iLvxSJkdHMpMBUwAQl7i4KIt34eV-_MrZTl_JgueGhiwopPodWP-NzO1b3Dj/pub?output=csv';

    const tableHead = document.querySelector("#invoice-table thead");
    const tableBody = document.querySelector("#invoice-table tbody");
    const filterContainer = document.querySelector("#filter-container");

    /**
     * Mengubah format tanggal dari DD/MM/YYYY ke YYYY-MM-DD agar valid untuk input type="date"
     * @param {string} dateString - Tanggal dalam format DD/MM/YYYY
     * @returns {string} Tanggal dalam format YYYY-MM-DD atau string kosong jika tidak valid
     */
    function formatDateForInput(dateString) {
        if (!dateString || dateString.length < 8) return '';
        try {
            const parts = dateString.split('/');
            if (parts.length !== 3) return '';
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error("Gagal memformat tanggal:", dateString, error);
            return '';
        }
    }
    
    /**
     * Mem-parse teks CSV menjadi array of objects
     * @param {string} csvText - Teks mentah dari file CSV
     * @returns {Array<Object>}
     */
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines.shift().split(',').map(header => header.trim().replace(/"/g, ''));
        
        return lines.map(line => {
            const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index] || '';
            });
            return entry;
        });
    }

    /**
     * Menampilkan data ke dalam tabel HTML
     * @param {Array<Object>} data - Data tagihan
     * @param {Array<string>} headers - Nama-nama kolom
     */
    function renderTable(data, headers) {
        // Kosongkan header dan body tabel terlebih dahulu
        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        // Buat header tabel
        const headerRow = document.createElement('tr');
        headers.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key.replace(/_/g, ' ');
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Jika tidak ada data, tampilkan pesan
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="loading">Tidak ada data untuk ditampilkan.</td></tr>`;
            return;
        }

        // Isi setiap baris tabel dengan data
        data.forEach(item => {
            const row = document.createElement('tr');
            headers.forEach(key => {
                const td = document.createElement('td');
                // Atribut data-label ini PENTING untuk tampilan responsif di mobile
                td.setAttribute('data-label', key.replace(/_/g, ' '));

                if (key.toLowerCase() === 'tanda terima') {
                    const dateInput = document.createElement('input');
                    dateInput.type = 'date';
                    dateInput.value = formatDateForInput(item[key]);
                    td.appendChild(dateInput);
                } else {
                    td.textContent = item[key];
                }
                row.appendChild(td);
            });
            tableBody.appendChild(row);
        });
    }

    /**
     * Membuat dan mengelola filter dropdown
     * @param {Array<Object>} data - Seluruh data tagihan
     * @param {Array<string>} headers - Nama-nama kolom
     */
    function setupFilters(data, headers) {
        filterContainer.innerHTML = '';
        const locationIndex = headers.findIndex(header => header.toLowerCase() === 'lokasi');
        
        if (locationIndex !== -1) {
            const label = document.createElement('label');
            label.htmlFor = 'location-filter';
            label.textContent = 'Filter Lokasi:';

            const select = document.createElement('select');
            select.id = 'location-filter';

            const options = ['Semua Lokasi', 'kantor', 'toko', 'sales', 'kolektor'];
            options.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue === 'Semua Lokasi' ? '' : optionValue.toLowerCase();
                option.textContent = optionValue.charAt(0).toUpperCase() + optionValue.slice(1);
                select.appendChild(option);
            });

            filterContainer.appendChild(label);
            filterContainer.appendChild(select);

            select.addEventListener('change', (e) => {
                const selectedValue = e.target.value;
                const rows = tableBody.querySelectorAll('tr');

                rows.forEach(row => {
                    if (selectedValue === '') {
                        row.style.display = '';
                    } else {
                        // Cari textContent dari sel lokasi di setiap baris
                        const cell = row.querySelector(`td[data-label="lokasi"]`);
                        if (cell && cell.textContent.toLowerCase() === selectedValue) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    }
                });
            });
        }
    }
    
    /**
     * Fungsi utama untuk memuat, mem-parse, dan menampilkan data
     */
    async function main() {
        try {
            const response = await fetch(csvUrl);
            if (!response.ok) throw new Error(`Gagal mengambil data: Status ${response.status}`);
            
            const csvText = await response.text();
            const data = parseCSV(csvText);
            
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                renderTable(data, headers);
                setupFilters(data, headers);
            } else {
                renderTable([], []);
            }

        } catch (error) {
            console.error("Terjadi kesalahan:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="loading">Gagal memuat data. Silakan periksa konsol (F12) untuk detail.</td></tr>`;
        }
    }

    // Panggil fungsi utama untuk memulai proses
    main();
});
