const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

// API: Get all tables and summary
router.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableSummaries = [];
    for (const t of tables) {
      const [countRes] = await sequelize.query(`SELECT count(*) as count FROM "${t.table_name}";`);
      tableSummaries.push({
        name: t.table_name,
        count: parseInt(countRes[0].count, 10)
      });
    }

    res.json({ tables: tableSummaries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get table rows and schema
router.get('/api/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Verify valid table name to prevent injection
    const [validCheck] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = :t;
    `, { replacements: { t: tableName } });

    if (validCheck.length === 0) {
      return res.status(404).json({ error: 'Table non trouvée' });
    }

    // Get columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = :t
      ORDER BY ordinal_position;
    `, { replacements: { t: tableName } });

    // Get rows
    const [rows] = await sequelize.query(`SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset};`);
    const [countRes] = await sequelize.query(`SELECT count(*) as count FROM "${tableName}";`);

    res.json({
      tableName,
      columns,
      totalCount: parseInt(countRes[0].count, 10),
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Run custom SQL query
router.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'Requête SQL requise' });
    }

    const [results, metadata] = await sequelize.query(sql);
    res.json({
      results: Array.isArray(results) ? results : [results],
      rowCount: Array.isArray(results) ? results.length : 1
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Full Single-Page Web GUI Interface (HTML + CSS + Modern JS)
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScholarAI - PostgreSQL Database Web Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0B1120;
      --card-dark: #131E35;
      --card-hover: #1E293B;
      --border-dark: #26354D;
      --primary: #4F46E5;
      --primary-light: #6366F1;
      --primary-glow: rgba(79, 70, 229, 0.4);
      --accent: #10B981;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --text-sub: #64748B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    /* Sidebar */
    .sidebar {
      width: 320px;
      background-color: var(--card-dark);
      border-right: 1px solid var(--border-dark);
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .brand {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-dark);
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px var(--primary-glow);
    }
    .brand-title {
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .nav-tabs {
      display: flex;
      padding: 12px 16px;
      gap: 8px;
      border-bottom: 1px solid var(--border-dark);
    }
    .nav-tab-btn {
      flex: 1;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 8px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .nav-tab-btn.active {
      background: rgba(79, 70, 229, 0.2);
      border-color: var(--primary);
      color: #FFF;
    }
    .table-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .table-item {
      padding: 10px 14px;
      border-radius: 10px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s ease;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .table-item:hover {
      background: var(--card-hover);
      color: var(--text-main);
    }
    .table-item.active {
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%);
      border-color: var(--primary);
      color: #FFF;
      font-weight: 700;
    }
    .badge-count {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 20px;
      background: #1E293B;
      color: var(--text-muted);
      border: 1px solid var(--border-dark);
    }
    .table-item.active .badge-count {
      background: var(--primary);
      color: #FFF;
      border-color: transparent;
    }

    /* Main Area */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: #090E17;
    }
    .topbar {
      padding: 16px 28px;
      background: var(--card-dark);
      border-bottom: 1px solid var(--border-dark);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .active-table-title {
      font-size: 1.25rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-refresh {
      background: rgba(79, 70, 229, 0.15);
      border: 1px solid var(--primary);
      color: #FFF;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-refresh:hover {
      background: var(--primary);
    }
    .content-body {
      flex: 1;
      overflow: auto;
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .table-container {
      background: var(--card-dark);
      border: 1px solid var(--border-dark);
      border-radius: 14px;
      overflow: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th {
      background: #111B2E;
      color: var(--text-muted);
      font-weight: 700;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-dark);
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
    }
    td {
      padding: 12px 18px;
      border-bottom: 1px solid rgba(38, 53, 77, 0.5);
      white-space: nowrap;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .type-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      color: #818CF8;
      background: rgba(79, 70, 229, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }
    .json-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      background: rgba(16, 185, 129, 0.1);
      color: #34D399;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid rgba(16, 185, 129, 0.2);
      display: inline-block;
    }
    .json-cell:hover {
      background: rgba(16, 185, 129, 0.2);
    }
    .sql-box {
      background: var(--card-dark);
      border: 1px solid var(--border-dark);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .sql-textarea {
      width: 100%;
      height: 120px;
      background: #090E17;
      border: 1px solid var(--border-dark);
      border-radius: 10px;
      color: #38BDF8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.92rem;
      padding: 14px;
      outline: none;
      resize: vertical;
    }
    .sql-textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
    .sql-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .preset-btns {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .preset-btn {
      background: #1E293B;
      border: 1px solid var(--border-dark);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    .preset-btn:hover {
      background: #334155;
      color: #FFF;
    }
    /* Modal JSON Viewer */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      background: var(--card-dark);
      border: 1px solid var(--border-dark);
      border-radius: 16px;
      width: 650px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-dark);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      background: #090E17;
      color: #38BDF8;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.4rem;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- Left Sidebar -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-icon">🐘</div>
      <div>
        <div class="brand-title">PostgreSQL Explorer</div>
        <div class="brand-subtitle">ScholarAI • Base <code>rmatss_db</code></div>
      </div>
    </div>

    <div class="nav-tabs">
      <button class="nav-tab-btn active" id="tabTablesBtn" onclick="switchView('tables')">
        📁 Tables (<span id="totalTablesCount">17</span>)
      </button>
      <button class="nav-tab-btn" id="tabSqlBtn" onclick="switchView('sql')">
        ⚡ Console SQL
      </button>
    </div>

    <div class="table-list" id="tablesList">
      <div style="padding: 20px; text-align: center; color: var(--text-muted);">Chargement des tables...</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <div class="topbar">
      <div class="active-table-title" id="viewTitle">
        <span>📊</span>
        <span id="currentTitleText">Sélectionnez une table</span>
        <span class="badge-count" id="currentRowCount">0 lignes</span>
      </div>
      <button class="btn-refresh" onclick="refreshCurrentView()">
        🔄 Actualiser
      </button>
    </div>

    <!-- Body Views -->
    <div class="content-body" id="bodyView">
      
      <!-- Table View -->
      <div id="tableViewSection">
        <div class="table-container">
          <table id="dataTable">
            <thead id="dataThead"></thead>
            <tbody id="dataTbody"></tbody>
          </table>
        </div>
      </div>

      <!-- SQL Console View -->
      <div id="sqlViewSection" style="display: none;">
        <div class="sql-box">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">Console de Requête SQL PostgreSQL :</div>
          <textarea class="sql-textarea" id="sqlInput" placeholder="Tapez votre requête SQL... (Ex: SELECT * FROM users;)">SELECT * FROM users;</textarea>
          
          <div class="sql-actions">
            <div class="preset-btns">
              <button class="preset-btn" onclick="setSql('SELECT * FROM users;')">👥 users</button>
              <button class="preset-btn" onclick="setSql('SELECT * FROM tutoring_sessions ORDER BY \\"createdAt\\" DESC LIMIT 10;')">🤖 sessions</button>
              <button class="preset-btn" onclick="setSql('SELECT * FROM course_documents;')">📄 documents</button>
              <button class="preset-btn" onclick="setSql('SELECT * FROM attendance ORDER BY date DESC LIMIT 10;')">📅 attendance</button>
              <button class="preset-btn" onclick="setSql('SELECT * FROM pfsm;')">🧠 pfsm</button>
            </div>
            <button class="btn-refresh" style="background: var(--primary);" onclick="executeCustomSql()">
              ⚡ Exécuter la Requête
            </button>
          </div>
        </div>

        <div class="table-container" style="margin-top: 10px;">
          <table id="sqlResultTable">
            <thead id="sqlResultThead"></thead>
            <tbody id="sqlResultTbody"></tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- JSON Viewer Modal -->
  <div class="modal-backdrop" id="jsonModal">
    <div class="modal-card">
      <div class="modal-header">
        <div style="font-weight: 700; font-size: 1rem;">🔍 Inspecteur JSON / Objet</div>
        <button class="close-btn" onclick="closeJsonModal()">&times;</button>
      </div>
      <div class="modal-body" id="jsonModalContent"></div>
    </div>
  </div>

  <script>
    let currentTable = 'users';
    let currentMode = 'tables';

    async function loadTables() {
      try {
        const res = await fetch('/db/api/tables');
        const data = await res.json();
        const listEl = document.getElementById('tablesList');
        document.getElementById('totalTablesCount').textContent = data.tables.length;

        listEl.innerHTML = data.tables.map(t => \`
          <div class="table-item \${t.name === currentTable ? 'active' : ''}" onclick="selectTable('\${t.name}')">
            <span>\${getTableIcon(t.name)} \${t.name}</span>
            <span class="badge-count">\${t.count}</span>
          </div>
        \`).join('');

        if (currentTable) {
          selectTable(currentTable);
        }
      } catch (err) {
        console.error('Erreur chargement tables:', err);
      }
    }

    function getTableIcon(name) {
      if (name.includes('user') || name.includes('parent') || name.includes('student') || name.includes('teacher')) return '👥';
      if (name.includes('session') || name.includes('tutor')) return '🤖';
      if (name.includes('pfsm') || name.includes('rl')) return '🧠';
      if (name.includes('doc') || name.includes('course')) return '📄';
      if (name.includes('homework') || name.includes('quiz')) return '📚';
      if (name.includes('attendance')) return '📅';
      if (name.includes('alert')) return '🔔';
      return '📁';
    }

    async function selectTable(name) {
      currentTable = name;
      document.querySelectorAll('.table-item').forEach(el => el.classList.remove('active'));
      const activeEl = Array.from(document.querySelectorAll('.table-item')).find(el => el.textContent.includes(name));
      if (activeEl) activeEl.classList.add('active');

      document.getElementById('currentTitleText').textContent = \`Table: \${name}\`;
      document.getElementById('dataThead').innerHTML = '<tr><th style="padding: 20px;">Chargement des données...</th></tr>';
      document.getElementById('dataTbody').innerHTML = '';

      try {
        const res = await fetch(\`/db/api/table/\${name}?limit=100\`);
        const data = await res.json();

        document.getElementById('currentRowCount').textContent = \`\${data.totalCount} ligne(s)\`;

        // Render Thead
        const theadHtml = '<tr>' + data.columns.map(c => \`
          <th>\${c.column_name} <span class="type-pill">\${c.data_type}</span></th>
        \`).join('') + '</tr>';
        document.getElementById('dataThead').innerHTML = theadHtml;

        // Render Tbody
        if (data.rows.length === 0) {
          document.getElementById('dataTbody').innerHTML = '<tr><td colspan="' + data.columns.length + '" style="text-align: center; padding: 40px; color: var(--text-muted);">Aucune donnée dans cette table</td></tr>';
          return;
        }

        const tbodyHtml = data.rows.map(row => {
          return '<tr>' + data.columns.map(c => {
            const val = row[c.column_name];
            if (val === null || val === undefined) {
              return '<td style="color: var(--text-sub); font-style: italic;">null</td>';
            }
            if (typeof val === 'object') {
              const str = JSON.stringify(val);
              return '<td><span class="json-cell" onclick=\\'openJsonModal(' + JSON.stringify(str) + ')\\'>{ JSON: ' + Object.keys(val).length + ' clés }</span></td>';
            }
            if (typeof val === 'boolean') {
              return '<td><span style="color: ' + (val ? '#34D399' : '#F87171') + '; font-weight: 700;">' + val + '</span></td>';
            }
            return '<td>' + String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>';
          }).join('') + '</tr>';
        }).join('');

        document.getElementById('dataTbody').innerHTML = tbodyHtml;
      } catch (err) {
        console.error('Erreur table data:', err);
      }
    }

    function switchView(mode) {
      currentMode = mode;
      document.getElementById('tabTablesBtn').classList.toggle('active', mode === 'tables');
      document.getElementById('tabSqlBtn').classList.toggle('active', mode === 'sql');

      document.getElementById('tableViewSection').style.display = mode === 'tables' ? 'block' : 'none';
      document.getElementById('sqlViewSection').style.display = mode === 'sql' ? 'block' : 'none';

      if (mode === 'sql') {
        document.getElementById('currentTitleText').textContent = 'Console Interactive SQL';
        document.getElementById('currentRowCount').textContent = 'PostgreSQL Query';
      } else {
        selectTable(currentTable);
      }
    }

    function setSql(q) {
      document.getElementById('sqlInput').value = q;
      executeCustomSql();
    }

    async function executeCustomSql() {
      const sql = document.getElementById('sqlInput').value.trim();
      if (!sql) return;

      document.getElementById('sqlResultThead').innerHTML = '<tr><th style="padding: 15px;">Exécution en cours...</th></tr>';
      document.getElementById('sqlResultTbody').innerHTML = '';

      try {
        const res = await fetch('/db/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await res.json();

        if (data.error) {
          document.getElementById('sqlResultThead').innerHTML = '<tr><th style="color: #F87171;">Erreur SQL</th></tr>';
          document.getElementById('sqlResultTbody').innerHTML = '<tr><td style="color: #F87171; padding: 20px;">' + data.error + '</td></tr>';
          return;
        }

        const rows = data.results || [];
        if (rows.length === 0) {
          document.getElementById('sqlResultThead').innerHTML = '<tr><th>Résultat</th></tr>';
          document.getElementById('sqlResultTbody').innerHTML = '<tr><td style="padding: 20px; color: var(--text-muted);">Requête exécutée avec succès (0 ligne retournée).</td></tr>';
          return;
        }

        const cols = Object.keys(rows[0]);
        document.getElementById('sqlResultThead').innerHTML = '<tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>';
        document.getElementById('sqlResultTbody').innerHTML = rows.map(r => {
          return '<tr>' + cols.map(c => {
            const v = r[c];
            if (v === null || v === undefined) return '<td style="color: var(--text-sub);">null</td>';
            if (typeof v === 'object') return '<td><span class="json-cell" onclick=\\'openJsonModal(' + JSON.stringify(JSON.stringify(v)) + ')\\'>{ JSON }</span></td>';
            return '<td>' + String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>';
          }).join('') + '</tr>';
        }).join('');
      } catch (err) {
        console.error('Erreur SQL:', err);
      }
    }

    function openJsonModal(jsonStr) {
      try {
        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        document.getElementById('jsonModalContent').textContent = JSON.stringify(parsed, null, 2);
      } catch (e) {
        document.getElementById('jsonModalContent').textContent = jsonStr;
      }
      document.getElementById('jsonModal').style.display = 'flex';
    }

    function closeJsonModal() {
      document.getElementById('jsonModal').style.display = 'none';
    }

    function refreshCurrentView() {
      if (currentMode === 'tables') {
        loadTables();
      } else {
        executeCustomSql();
      }
    }

    // Init
    loadTables();
  </script>
</body>
</html>`);
});

module.exports = router;
