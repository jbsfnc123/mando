document.addEventListener("DOMContentLoaded", () => {
    
    // =================================================================================
    // PASTE URL WEB APP DARI GOOGLE APPS SCRIPT ANDA DI SINI
    // =================================================================================
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJIGQ3sLk8qFIOjb-coYpP8_s1JrYhb-NFAXuyPd5PCeLkvlfzUxv5gkepq6EDB-zU/exec'; 
    // =================================================================================

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJulpWQwI2qu1Lji-iLvxSJkdHMpMBUwAQl7i4KIt34eV-_MrZTl_JgueGhiwopPodWP-NzO1b3Dj/pub?output=csv';

    const tableHead = document.querySelector("#invoice-table thead");
    const tableBody = document.querySelector("#invoice-table tbody");
    
    /**
     * Mem-parse teks CSV menjadi array of objects
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
     * Mengirim pembaruan lokasi ke Google Apps Script
     * @param {string} invoiceId - ID Invoice yang akan diupdate
     * @param {string} newLocation - Nilai lokasi baru
     * @param {HTMLElement} selectElement - Elemen dropdown yang diubah
     */
    async function updateLocation(invoiceId, newLocation, selectElement) {
        if (WEB_APP_URL === 'PASTE_URL_ANDA_DI_SINI' || !WEB_APP_URL) {
            alert("Error: URL Web App belum dikonfigurasi di dalam script.js");
            return;
        }

        const originalBackgroundColor = selectElement.style.backgroundColor;
        selectElement.style.backgroundColor = '#ffeb3b'; // Warna kuning saat loading

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ invoiceId: invoiceId, newLocation: newLocation }),
            });

            // Karena Apps Script terkadang melakukan redirect, kita tidak bisa selalu membaca body json
            // Kita anggap jika request berhasil (status 200), update sukses.
            if (response.ok) {
                 selectElement.style.backgroundColor = '#c8e6c9'; // Warna hijau jika sukses
            } else {
                throw new Error("Gagal mengirim data ke server.");
            }
            
        } catch (error) {
            console.error("Error saat update:", error);
            alert("Gagal memperbarui lokasi. Silakan cek konsol untuk detail.");
            selectElement.style.backgroundColor = '#ffcdd2'; // Warna merah jika gagal
        } finally {
            // Kembalikan warna setelah beberapa saat
            setTimeout(() => {
                selectElement.style.backgroundColor = originalBackgroundColor;
            }, 2000);
        }
    }


    /**
     * Menampilkan data ke dalam tabel HTML
     */
    function renderTable(data) {
        tableHead.innerHTML = "";
        tableBody.innerHTML = "";
        const headers = data.length > 0 ? Object.keys(data[0]) : [];

        const headerRow = document.createElement('tr');
        headers.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key.replace(/_/g, ' ');
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length || 1}" class="loading">Tidak ada data.</td></tr>`;
            return;
        }

        data.forEach(item => {
            // Simpan invoiceId dari baris ini
            const invoiceId = item["invoice"]; // Pastikan nama kolom "Invoice ID" benar
            if (!invoiceId) return;

            const row = document.createElement('tr');
            
            headers.forEach(key => {
                const td = document.createElement('td');
                td.setAttribute('data-label', key.replace(/_/g, ' '));

                if (key.toLowerCase() === 'lokasi') {
                    // Buat dropdown untuk kolom "Lokasi"
                    const select = document.createElement('select');
                    select.className = 'location-select';
                    const options = ['kantor', 'toko', 'sales', 'kolektor'];
                    
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                        select.appendChild(option);
                    });
                    
                    select.value = item[key].toLowerCase(); // Set nilai awal dropdown
                    
                    // Tambahkan event listener untuk mengirim update saat nilai berubah
                    select.addEventListener('change', (e) => {
                        updateLocation(invoiceId, e.target.value, e.target);
                    });
                    
                    td.appendChild(select);
                } else {
                    td.textContent = item[key];
                }
                row.appendChild(td);
            });
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Fungsi utama
     */
    async function main() {
        try {
            const response = await fetch(csvUrl);
            if (!response.ok) throw new Error(`Gagal mengambil data CSV: Status ${response.status}`);
            
            const csvText = await response.text();
            const data = parseCSV(csvText);
            renderTable(data);

        } catch (error) {
            console.error("Terjadi kesalahan:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="loading">Gagal memuat data.</td></tr>`;
        }
    }

    main();
});
