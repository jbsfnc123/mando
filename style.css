/* Import Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
    --bg-color: #1e1e1e;
    --window-bg: rgba(45, 45, 45, 0.7);
    --dock-bg: rgba(30, 30, 30, 0.5);
    --border-color: rgba(255, 255, 255, 0.1);
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0a0;
    --accent-color: #0A84FF;
    --green-color: #30D158;
    --red-color: #FF453A;
    --yellow-color: #FFD60A;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-image: url('https://source.unsplash.com/random/1920x1080?dark-abstract'); /* Wallpaper acak */
    background-size: cover;
    background-position: center;
    color: var(--text-primary);
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    overflow: hidden;
}

.app-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.main-content {
    width: 90%;
    max-width: 1200px;
    height: 85%;
    position: relative;
}

.view {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--window-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    display: none;
    flex-direction: column;
    overflow: hidden;
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.view.active {
    display: flex;
    opacity: 1;
    transform: scale(1);
    z-index: 10;
}

.view:not(.active) {
    opacity: 0;
    transform: scale(0.95);
}

.window-header {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--border-color);
    user-select: none;
}

.window-controls {
    display: flex;
    gap: 8px;
    margin-right: 15px;
}

.control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}
.control.close { background: var(--red-color); }
.control.minimize { background: var(--yellow-color); }
.control.maximize { background: var(--green-color); }

.window-title {
    font-weight: 600;
    color: var(--text-secondary);
}

.window-body {
    padding: 20px;
    flex-grow: 1;
    overflow-y: auto;
}

/* Scrollbar styling */
.window-body::-webkit-scrollbar {
    width: 8px;
}
.window-body::-webkit-scrollbar-track {
    background: transparent;
}
.window-body::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
}

/* Dashboard Styles */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.card {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
}
.card.large {
    grid-column: span 2;
}
.card h3 {
    color: var(--text-secondary);
    font-size: 1rem;
    margin-bottom: 15px;
}
.card p {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.card .ratio-text {
    color: var(--yellow-color);
}
.card .saldo-text {
    color: var(--green-color);
}
.card small {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-top: 5px;
    display: block;
}

.progress-bar-container {
    width: 100%;
    height: 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
    margin-top: 10px;
    overflow: hidden;
}
.progress-bar {
    height: 100%;
    width: 0%;
    background-color: var(--yellow-color);
    border-radius: 5px;
    transition: width 0.5s ease-in-out;
}


/* Form & List Styles */
form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}
input, select {
    width: 100%;
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 1rem;
}
input::placeholder { color: var(--text-secondary); }
select {
    flex-grow: 0;
    flex-shrink: 0;
}
form button {
    padding: 12px 20px;
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s ease;
}
form button:hover {
    background-color: #0a78e0;
}
#transaction-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}
#transaction-form button {
    grid-column: span 2;
}

ul {
    list-style: none;
    max-height: 250px;
    overflow-y: auto;
    padding-right: 10px;
}
li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 10px;
}
li button {
    background: none;
    border: none;
    color: var(--red-color);
    cursor: pointer;
    font-size: 1rem;
}

.planning-layout {
    display: flex;
    gap: 20px;
}
.planning-section {
    flex: 1;
}

/* Table Styles */
.table-container {
    max-height: calc(100% - 150px);
    overflow-y: auto;
}
table {
    width: 100%;
    border-collapse: collapse;
}
th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}
th {
    font-weight: 600;
    color: var(--text-secondary);
}
td .income-text { color: var(--green-color); }
td .expense-text { color: var(--red-color); }
td button { background: none; border: none; color: var(--red-color); cursor: pointer; }

/* Dock Styles */
.dock {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
    gap: 15px;
    padding: 10px;
    background: var(--dock-bg);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    z-index: 100;
}
.dock-item {
    position: relative;
    cursor: pointer;
    transition: transform 0.2s ease;
}
.dock-item i {
    font-size: 48px;
    color: var(--text-primary);
    width: 60px;
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.dock-item:hover {
    transform: scale(1.2) translateY(-10px);
}
.dock-item span {
    position: absolute;
    bottom: 110%;
    left: 50%;
    transform: translateX(-50%);
    background: #111;
    color: #fff;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 0.8rem;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease;
}
.dock-item:hover span {
    opacity: 1;
    visibility: visible;
}
