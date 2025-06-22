/* Import font dari Google Fonts dan reset dasar */
:root {
    --primary-color: #3f51b5;
    --primary-light: #e8eaf6;
    --text-dark: #333;
    --text-light: #ffffff;
    --bg-light: #f0f2f5;
    --bg-white: #ffffff;
    --border-color: #e0e0e0;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Roboto', sans-serif;
    background-color: var(--bg-light);
    color: var(--text-dark);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 20px;
}

.container {
    width: 100%;
    max-width: 1100px;
    background-color: var(--bg-white);
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    padding: 30px;
    overflow: hidden;
}

h1 {
    text-align: center;
    color: #1a237e;
    margin-bottom: 25px;
    font-weight: 700;
}

/* Styling untuk Filter Dropdown */
#filter-container {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
}

#filter-container label {
    font-weight: 500;
}

#location-filter {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 15px;
    background-color: var(--bg-white);
    cursor: pointer;
}

.table-wrapper {
    overflow-x: auto; /* Agar tabel bisa di-scroll horizontal jika perlu */
}

table {
    width: 100%;
    border-collapse: collapse;
}

thead th {
    background-color: var(--primary-color);
    color: var(--text-light);
    padding: 15px;
    text-align: left;
    font-weight: 500;
    font-size: 16px;
    text-transform: capitalize;
    white-space: nowrap;
}

tbody tr {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.2s ease;
}

tbody tr:nth-child(even) {
    background-color: #f8f9fa;
}

tbody tr:hover {
    background-color: var(--primary-light);
}

td {
    padding: 15px;
    font-size: 15px;
    vertical-align: middle;
}

/* Styling untuk input tanggal di dalam tabel */
td input[type="date"] {
    width: 100%;
    min-width: 150px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: 'Roboto', sans-serif;
    font-size: 15px;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #777;
    font-style: italic;
}

/* --- TAMPILAN RESPONSIVE UNTUK LAYAR KECIL (MOBILE) --- */
@media (max-width: 768px) {
    .container {
        padding: 15px;
    }
    
    h1 {
        font-size: 1.5rem;
    }

    /* Sembunyikan header tabel */
    thead {
        display: none;
    }

    /* Ubah baris menjadi blok seperti kartu */
    tr {
        display: block;
        margin-bottom: 15px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        background-color: var(--bg-white);
    }
    
    tbody tr:nth-child(even) {
        background-color: var(--bg-white); /* Hapus zebra stripe di mode kartu */
    }

    /* Ubah sel menjadi blok penuh */
    td {
        display: block;
        text-align: right; /* Nilai di kanan */
        padding-left: 50%; /* Beri ruang untuk label */
        position: relative;
        border-bottom: 1px dotted var(--border-color);
    }
    
    td:last-child {
        border-bottom: none;
    }

    /* Buat label dari atribut data-label */
    td::before {
        content: attr(data-label);
        position: absolute;
        left: 15px;
        width: 45%; /* Lebar label */
        padding-right: 10px;
        text-align: left; /* Label di kiri */
        font-weight: 500;
        text-transform: capitalize;
    }
    
    td input[type="date"] {
        width: auto;
        max-width: 100%;
    }
}
