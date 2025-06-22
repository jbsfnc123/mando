// Menunggu hingga seluruh konten HTML (DOM) selesai dimuat sebelum menjalankan script
document.addEventListener("DOMContentLoaded", () => {
    
    // URL dari Google Sheets yang sudah dipublikasikan sebagai CSV
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJulpWQwI2qu1Lji-iLvxSJkdHMpMBUwAQl7i4KIt34eV-_MrZTl_JgueGhiwopPodWP-NzO1b3Dj/pub?output=csv';

    // Mengambil elemen tabel dari HTML
    const tableHead = document.querySelector("#invoice-table thead");
    const tableBody = document.querySelector("#invoice-table tbody");

    /**
     * Fungsi utama untuk memuat dan menampilkan data dari CSV
     */
    async function loadInvoiceData() {
        try {
            // Mengambil data dari URL menggunakan Fetch API
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error(`Gagal mengambil data: Status ${response.status}`);
            }
            const csvText = await response.text();
            
            // Mem-parse teks CSV menjadi data yang terstruktur
            const data = parseCSV(csvText);

            // Menampilkan data ke dalam tabel HTML
            displayData(data);

        } catch (error) {
            console.error("Terjadi kesalahan:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="loading">Gagal memuat data. Silakan cek koneksi atau URL.</td></tr>`;
        }
    }

    /**
     * Fungsi untuk mengubah string CSV menjadi array of objects
     * @param {string} csvText - Teks mentah dari file CSV
     * @returns {Array<Object>}
     */
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines.shift().split(',').map(header => header.trim());
        
        return lines.map(line => {
            const values = line.split(',');
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index].trim();
            });
            return entry;
        });
    }

    /**
     * Fungsi untuk menampilkan data yang sudah di-parse ke dalam tabel HTML
     * @param {Array<Object>} data - Data tagihan dalam format array of objects
     */
    function displayData(data) {
        // Kosongkan header dan body tabel terlebih dahulu
        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        // Jika tidak ada data, tampilkan pesan
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="loading">Tidak ada data untuk ditampilkan.</td></tr>`;
            return;
        }

        // Membuat header tabel secara dinamis
        const headerRow = document.createElement('tr');
        Object.keys(data[0]).forEach(key => {
            const th = document.createElement('th');
            th.textContent = key.replace(/_/g, ' '); // Ganti underscore dengan spasi untuk tampilan
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Mengisi setiap baris tabel dengan data
        data.forEach(item => {
            const row = document.createElement('tr');
            Object.values(item).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                row.appendChild(td);
            });
            tableBody.appendChild(row);
        });
    }

    // Panggil fungsi utama untuk memulai proses
    loadInvoiceData();
});