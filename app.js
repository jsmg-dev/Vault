const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session'); // <-- IMPORT HERE
const app = express();
const usersRouter = require('./routes/users');
const policiesRouter = require('./routes/policies'); // adjust path
const cors = require("cors");

const port = 8080;


// Add after bodyParser middleware
app.use(session({
  secret: 'your-secret-key',   // change this to a strong random key
  resave: false,
  saveUninitialized: false,  // only store session if modified
cookie: { secure: false }    // set secure: true only if using HTTPS
}));



// === Connect to SQLite Database ===
const db = new sqlite3.Database('./loan.db', (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});
app.locals.db = db;

// === Middleware ===
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// === Import Routes ===
const authRoutes = require('./routes/auth');

const customerRoutes = require('./routes/customers');
const depositRoutes = require('./routes/deposits');
const reportsRoutes = require('./routes/reports');


// === Mount Routes ===
app.use('/auth', authRoutes);
app.use('/users', usersRouter);
app.use('/customers', customerRoutes);
app.use('/deposits', depositRoutes);
app.use('/reports', reportsRoutes);
app.use('/policies', policiesRouter); 
app.use(cors());
// === Login Page ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

// === Login Handler ===
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

  db.get(query, [username, password], (err, row) => {
    if (err) {
      console.error('❌ Login DB error:', err.message);
      return res.status(500).send('Internal server error');
    }

    if (row) {
      // ✅ Store user in session in the SAME format as auth.js
      req.session.user = {
        id: row.id,
        username: row.username,
        role: row.role
      };

      return res.redirect('/pages/dashboard.html');
    } else {
      return res.status(401).send('Invalid username or password');
    }
  });
});
// Get total customers
app.get('/customers/count', (req, res) => {
  const query = `SELECT COUNT(*) AS total FROM customers`;
  db.get(query, [], (err, row) => {
    if (err) {
      console.error('❌ Failed to fetch total customers:', err.message);
      return res.status(500).json({ total: 0 });
    }
    res.json({ total: row.total });
  });
});

// === DELETE Customer ===
app.delete('/customers/delete/:id', (req, res) => {
  const id = req.params.id;
  const query = `DELETE FROM customers WHERE id = ?`;

  db.run(query, [id], function (err) {
    if (err) {
      console.error('❌ Failed to delete customer:', err.message);
      return res.status(500).json({ message: 'Failed to delete customer' });
    }
    res.json({ success: true, deletedId: id });
  });
});

// === 404 Fallback ===
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// === Start Server ===
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
// === API: Get a customer's code (by id) ===
app.get('/api/customers/:id/code', (req, res) => {
  const { id } = req.params;
  const q = `SELECT id, name, customer_code FROM customers WHERE id = ? LIMIT 1`;

  db.get(q, [id], (err, row) => {
    if (err) {
      console.error('❌ get code error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch customer code' });
    }
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json({ id: row.id, name: row.name, customer_code: row.customer_code });
  });
});
app.get('/reports/generate', async (req, res) => {
  const { type, start, end } = req.query;

  try {
    if (type === 'emi') {
      const sql = `
        SELECT 
            c.customer_code,
            c.name,
            c.start_date,
            c.emi,
            IFNULL(SUM(d.amount), 0) AS total_received
        FROM customers c
        LEFT JOIN deposits d 
            ON c.customer_code = d.customer_code
            AND d.date BETWEEN ? AND ?
        GROUP BY c.customer_code, c.name, c.start_date, c.emi
      `;

      const rows = await db.all(sql, [start, end]);

      const result = rows.map(r => {
        const emiCount = r.emi > 0 ? Math.floor(r.total_received / r.emi) : 0;
        let nextDate = null;

        if (r.start_date && emiCount > 0) {
          const baseDate = new Date(r.start_date);
          // ✅ as per your example: treat each EMI as +1 day
          baseDate.setDate(baseDate.getDate() + emiCount);
          nextDate = baseDate.toISOString().split('T')[0];
        }

        return {
          CustomerCode: r.customer_code,
          Name: r.name,
          StartDate: r.start_date,
          EMI: r.emi,
          TotalReceived: r.total_received,
          EMI_Count: emiCount,
          NextEMIDate: nextDate || 'N/A'
        };
      });

      return res.json(result);
    }

    // keep your existing 'customer' and 'deposit' logic
  } catch (err) {
    console.error("Report generation failed:", err);
    res.status(500).json({ error: "Report generation failed" });
  }
});
// Check EMI notifications (till date)
app.get('/emi/notifications', (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const query = `
    SELECT c.customer_code, c.name, c.start_date, c.emi, 
           IFNULL(SUM(d.amount), 0) AS total_deposit
    FROM customers c
    LEFT JOIN deposits d ON c.customer_code = d.customer_code
    GROUP BY c.customer_code
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("❌ DB error fetching EMI notifications:", err.message);
      return res.status(500).json({ error: err.message });
    }

    const notifications = [];

    rows.forEach(row => {
      const totalDeposits = row.total_deposit || 0;
      const emiAmount = row.emi || 1;
      const startDate = new Date(row.start_date);

      // Number of EMIs already paid
      const emiCount = Math.floor(totalDeposits / emiAmount);

      // Next EMI due date = start date + emiCount months
      const nextEmiDate = new Date(startDate);
      nextEmiDate.setMonth(startDate.getMonth() + emiCount);

      const nextEmiDateStr = nextEmiDate.toISOString().split("T")[0];

      // If EMI is due today or earlier → notify
      if (nextEmiDateStr <= today) {
        notifications.push({
          customer: row.name,
          dueDate: nextEmiDateStr,
          status: "EMI Due"
        });
      }
    });

    res.json({ notifications });
  });
});

// Node.js / Express example
app.get('/auth/me', (req, res) => {
  // assuming you store the logged-in user in session
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

  res.json({ role: req.session.user.role, username: req.session.user.username });
});


// EMI API Route
app.get('/emi', (req, res) => {
  let { amount, rate, months } = req.query;

  amount = parseFloat(amount);
  rate = parseFloat(rate);
  months = parseInt(months);

  if (!amount || !rate || !months) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const monthlyRate = (rate / 12) / 100;
  let emi;

  if (monthlyRate === 0) {
    emi = amount / months;
  } else {
    emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);
  }

  res.json({ emi: emi.toFixed(2) });
});
// === LIC Policies Table Setup ===
// === LIC Policies Table Setup ===
db.run(`
CREATE TABLE IF NOT EXISTS lic_policy_details (
  policy_id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_no TEXT,
  plan_name TEXT,
  start_date TEXT,
  end_date TEXT,
  mode_of_payment TEXT,
  next_premium_date TEXT,
  sum_assured REAL,
  policy_term INTEGER,
  premium_term INTEGER,
  premium_amount REAL,
  maturity_value REAL,
  fullname TEXT,
  dob TEXT,
  gender TEXT,
  marital_status TEXT,
  aadhaar_pan TEXT,
  email TEXT,
  mobile TEXT,
  address TEXT,
  height_cm REAL,
  weight_kg REAL,
  health_lifestyle TEXT,
  nominee_name TEXT,
  nominee_relation TEXT,
  bank_account TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  agent_code TEXT,
  branch_code TEXT
)
`);

// === Save a New Policy ===
app.post("/policies/add", (req, res) => {
  const data = req.body;
  const sql = `INSERT INTO lic_policy_details 
    (policy_no, plan_name, start_date, end_date, mode_of_payment, next_premium_date, sum_assured, policy_term, premium_term, premium_amount, maturity_value,
     fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address, height_cm, weight_kg, health_lifestyle,
     nominee_name, nominee_relation, bank_account, ifsc_code, bank_name, agent_code, branch_code)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  const params = [
    data.policy_no, data.plan_name, data.start_date, data.end_date, data.mode_of_payment, data.next_premium_date,
    data.sum_assured, data.policy_term, data.premium_term, data.premium_amount, data.maturity_value,
    data.fullname, data.dob, data.gender, data.marital_status, data.aadhaar_pan, data.email, data.mobile,
    data.address, data.height_cm, data.weight_kg, data.health_lifestyle,
    data.nominee_name, data.nominee_relation, data.bank_account, data.ifsc_code, data.bank_name, data.agent_code, data.branch_code
  ];

  db.run(sql, params, function(err) {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// === Fetch All Policies ===
app.get("/policies/list", (req, res) => {
  db.all("SELECT * FROM lic_policy_details ORDER BY policy_id DESC", [], (err, rows) => {
    if (err) {
      console.error("❌ Fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// === Delete Policy ===
app.delete("/policies/delete/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM lic_policy_details WHERE policy_id = ?", [id], function(err) {
    if (err) {
      console.error("❌ Delete error:", err.message);
      return res.status(500).json({ error: "Failed to delete policy" });
    }
    res.json({ success: true, deletedId: id });
  });
});

// === Update Policy by ID ===
app.put("/policies/update/:id", (req, res) => {
  const { id } = req.params;

  const {
    policy_no, plan_name, start_date, end_date, mode_of_payment, next_premium_date,
    sum_assured, policy_term, premium_term, premium_amount, maturity_value,
    fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
    height_cm, weight_kg, health_lifestyle,
    nominee_name, nominee_relation,
    bank_account, ifsc_code, bank_name,
    agent_code, branch_code
  } = req.body;

  const sql = `
    UPDATE lic_policy_details
    SET
      policy_no = ?, plan_name = ?, start_date = ?, end_date = ?, mode_of_payment = ?, next_premium_date = ?,
      sum_assured = ?, policy_term = ?, premium_term = ?, premium_amount = ?, maturity_value = ?,
      fullname = ?, dob = ?, gender = ?, marital_status = ?, aadhaar_pan = ?, email = ?, mobile = ?, address = ?,
      height_cm = ?, weight_kg = ?, health_lifestyle = ?, nominee_name = ?, nominee_relation = ?,
      bank_account = ?, ifsc_code = ?, bank_name = ?, agent_code = ?, branch_code = ?
    WHERE policy_id = ?
  `;

  const params = [
    policy_no, plan_name, start_date, end_date, mode_of_payment, next_premium_date,
    sum_assured, policy_term, premium_term, premium_amount, maturity_value,
    fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
    height_cm, weight_kg, health_lifestyle, nominee_name, nominee_relation,
    bank_account, ifsc_code, bank_name, agent_code, branch_code,
    id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error("❌ Update error:", err.message);
      return res.status(500).json({ error: "Failed to update policy" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ success: true, updatedId: id });
  });
});
