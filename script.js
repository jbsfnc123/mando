document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dataEntryForm');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Mencegah form dari submit secara default (reload halaman)

        // Reset pesan sebelumnya
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // --- Bagian ini perlu disesuaikan dengan Google Apps Script Anda ---
        // Anda perlu membuat Google Apps Script sebagai "web app"
        // yang menerima POST request dan menulis data ke spreadsheet.
        // Ganti URL di bawah dengan URL deploy Google Apps Script Anda.
        const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfnQpiEiUrXljFC3SbzjFaOXwSXpoQGip1xXzRmW1xjxhJZPwOt-qTROEgs3BI_dm2/exec'; 
        // Contoh: 'https://script.google.com/macros/s/AKfycbzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/exec'
        // --- Akhir bagian penyesuaian ---

        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                mode: 'cors', // Penting untuk cross-origin requests
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    messageDiv.textContent = 'Data berhasil dikirim!';
                    messageDiv.classList.add('success');
                    form.reset(); // Mengosongkan form setelah sukses
                } else {
                    messageDiv.textContent = 'Gagal mengirim data: ' + (result.message || 'Terjadi kesalahan');
                    messageDiv.classList.add('error');
                }
            } else {
                messageDiv.textContent = 'Error koneksi server: ' + response.statusText;
                messageDiv.classList.add('error');
            }
        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = 'Terjadi kesalahan jaringan atau server.';
            messageDiv.classList.add('error');
        }
    });
});