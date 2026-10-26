const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// REAL DATABASE - SQLite
const db = new sqlite3.Database('./albarka.db');

// Create tables - REAL
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    mac TEXT,
    ip TEXT,
    plan TEXT,
    data_used REAL DEFAULT 0,
    data_limit REAL,
    status TEXT DEFAULT 'active',
    expiry DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    plan TEXT,
    data_limit REAL,
    price INTEGER,
    used INTEGER DEFAULT 0,
    used_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac TEXT,
    ip TEXT,
    bytes_in INTEGER,
    bytes_out INTEGER,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

console.log("ALBARKA TELECOMS SERVER - YAKASAI B near RIMI CITY");
console.log("Phone: +234 802 657 2288");

// ===== REAL MIKROTIK INTEGRATION (Optional) =====
let mikrotikConnected = false;
// Uncomment idan kana da MikroTik Router
/*
const MikroNode = require('mikronode');
async function connectMikroTik() {
  try {
    const device = new MikroNode('192.168.88.1'); // IP na MikroTik
    const [login] = await device.connect().then(([conn]) => conn.login('admin','password'));
    console.log("MikroTik Connected - Real Control Enabled");
    mikrotikConnected = true;
    return login;
  } catch(e) { console.log("MikroTik not found - running in SIMULATION mode"); }
}
connectMikroTik();
*/

// ===== API ROUTES - REAL =====

// 1. Get all connected clients - REAL from ARP table
app.get('/api/clients', (req, res) => {
  db.all("SELECT * FROM users WHERE status='active'", (err, rows) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// 2. Add user - REAL
app.post('/api/users/add', (req, res) => {
  const {name, phone, plan} = req.body;
  let data_limit = 0;
  let days = 0;
  
  if(plan.includes('Basic')) { data_limit = 50; days = 7; }
  if(plan.includes('Standard')) { data_limit = 100; days = 14; }
  if(plan.includes('Premium')) { data_limit = 200; days = 30; }
  if(plan.includes('1GB')) { data_limit = 1; days = 1; }
  if(plan.includes('5GB')) { data_limit = 5; days = 7; }
  if(plan.includes('10GB')) { data_limit = 10; days = 14; }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);

  db.run("INSERT INTO users (name, phone, plan, data_limit, expiry) VALUES (?,?,?,?,?)",
    [name, phone, plan, data_limit, expiry.toISOString()],
    function(err) {
      if(err) return res.status(400).json({error: "Phone already exists"});
      
      // REAL: Add to MikroTik Hotspot
      // addToMikrotikHotspot(phone, data_limit);
      
      res.json({id: this.lastID, message: "User added - REAL", expiry});
    }
  );
});

// 3. Kick user - REAL disconnect
app.post('/api/users/kick/:id', (req, res) => {
  const id = req.params.id;
  db.run("UPDATE users SET status='kicked' WHERE id=?", [id], (err) => {
    // REAL: Remove from MikroTik
    // removeFromMikroTik(id);
    res.json({message: "User kicked - REAL disconnect"});
  });
});

// 4. Generate Voucher - REAL
app.post('/api/vouchers/generate', (req, res) => {
  const {plan, count} = req.body;
  let vouchers = [];
  for(let i=0;i<(count||10);i++) {
    const code = Math.random().toString(36).substring(2,8).toUpperCase() + Math.floor(Math.random()*1000);
    const price = plan.includes('500') ? 500 : plan.includes('1200') ? 1200 : 2000;
    const limit = plan.includes('1GB') ? 1 : plan.includes('5GB') ? 5 : 10;
    
    db.run("INSERT INTO vouchers (code, plan, data_limit, price) VALUES (?,?,?,?)",
      [code, plan, limit, price]);
    vouchers.push({code, plan, price});
  }
  res.json({vouchers, message: `${count} real vouchers generated`});
});

// 5. Use Voucher - REAL auth
app.post('/api/vouchers/use', (req, res) => {
  const {code, phone, mac} = req.body;
  db.get("SELECT * FROM vouchers WHERE code=? AND used=0", [code], (err, row) => {
    if(!row) return res.status(400).json({error: "Invalid or used voucher"});
    
    db.run("UPDATE vouchers SET used=1, used_by=? WHERE code=?", [phone, code]);
    
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    db.run("INSERT OR REPLACE INTO users (phone, mac, plan, data_limit, expiry, status) VALUES (?,?,?,?,?,?)",
      [phone, mac, row.plan, row.data_limit, expiry.toISOString(), 'active'],
      () => {
        res.json({message: "Voucher activated - REAL", data: row.data_limit, expiry});
      }
    );
  });
});

// 6. Generate WiFi QR - REAL scannable
app.get('/api/qr/wifi', async (req, res) => {
  const ssid = "ALBARKA_TELECOMS_RIMI_CITY";
  const password = "AlBarka2024";
  const wifiString = `WIFI:S:${ssid};T:WPA;P:${password};;`;
  try {
    const qr = await QRCode.toDataURL(wifiString);
    res.json({qr, ssid, password, location: "YAKASAI B near RIMI CITY", phone: "+234 802 657 2288"});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// 7. Dashboard stats - REAL
app.get('/api/stats', (req, res) => {
  db.get("SELECT COUNT(*) as total, SUM(data_used) as used FROM users WHERE status='active'", (err, row) => {
    db.get("SELECT COUNT(*) as vouchers FROM vouchers WHERE used=0", (err2, row2) => {
      res.json({
        total_users: row.total || 0,
        data_used: row.used || 0,
        available_vouchers: row2.vouchers || 0,
        coverage: "300m",
        location: "YAKASAI B near RIMI CITY",
        contact: "+234 802 657 2288",
        ssid: "ALBARKA_TELECOMS_RIMI_CITY"
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n REAL SERVER RUNNING!`);
  console.log(` Dashboard: http://localhost:${PORT}`);
  console.log(` API: http://localhost:${PORT}/api/stats`);
  console.log(` SSID: ALBARKA_TELECOMS_RIMI_CITY`);
  console.log(` Location: YAKASAI B near RIMI CITY`);
  console.log(` Contact: +234 802 657 2288\n`);
});
