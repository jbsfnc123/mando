/* ... Semua style dari jawaban sebelumnya tetap di sini ... */
/* Saya hanya akan menambahkan style baru dan modifikasi di bawah ini */

/* MODIFIKASI: Layout form transaksi untuk mengakomodasi input tanggal */
#transaction-form {
    display: grid;
    /* Ubah grid agar lebih fleksibel */
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}
#transaction-form button {
    grid-column: 1 / -1; /* Tombol submit mengambil lebar penuh */
}
/* Mengatur input tanggal agar tidak terlalu lebar di beberapa browser */
#transaction-date {
    min-width: 150px;
}

/* --- STYLE BARU --- */

/* Tombol-tombol baru */
.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}
#export-btn {
    padding: 8px 15px;
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
}
#export-btn:hover { background-color: #1765c7; }
#export-btn i { margin-right: 8px; }

/* Zona Berbahaya di Pengaturan */
.danger-zone {
    margin-top: 20px;
    padding: 20px;
    border: 1px solid var(--red-color);
    background-color: rgba(255, 69, 58, 0.1);
    border-radius: 8px;
}
.danger-zone h3 {
    color: var(--red-color);
    margin-bottom: 10px;
}
.danger-zone p {
    color: var(--text-secondary);
    margin-bottom: 15px;
    font-size: 0.9rem;
}
.danger-btn {
    width: 100%;
    padding: 12px 20px;
    background-color: var(--red-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s ease;
}
.danger-btn:hover { background-color: #d1302b; }
.danger-btn i { margin-right: 8px; }

/* Style untuk Modal Donasi */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: none; /* Diubah ke flex oleh JS */
    justify-content: center;
    align-items: center;
    z-index: 2000;
    opacity: 0;
    transition: opacity 0.3s ease;
}
.modal-overlay.show {
    display: flex;
    opacity: 1;
}
.modal-content {
    background: var(--window-bg);
    border: 1px solid var(--border-color);
    padding: 30px;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    position: relative;
    transform: scale(0.95);
    transition: transform 0.3s ease;
}
.modal-overlay.show .modal-content {
    transform: scale(1);
}
.modal-close {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
}
.modal-content h2 {
    margin-bottom: 15px;
    color: var(--text-primary);
}
.modal-content p {
    color: var(--text-secondary);
    line-height: 1.6;
}
.donation-info {
    margin-top: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}
.donation-info p {
    color: var(--text-primary);
    margin-bottom: 5px;
}
.donation-info p:last-child {
    margin-bottom: 0;
}
