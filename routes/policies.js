const express = require('express');
const router = express.Router();

// === Add New Policy ===
router.post('/add', (req, res) => {
  const db = req.app.locals.db;

  const {
    policy_no,
    fullname,
    dob,
    gender,
    marital_status,
    aadhaar_pan,
    email,
    mobile,
    address,
    plan_name,
    start_date,
    end_date,
    mode_of_payment,
    next_premium_date,
    sum_assured,
    policy_term,
    premium_term,
    premium,
    maturity_value,
    nominee_name,
    nominee_relation,
    height_cm,
    weight_kg,
    health_lifestyle,
    bank_account,
    ifsc_code,
    bank_name,
    agent_code,
    branch_code,
    status
  } = req.body;

  const sql = `
    INSERT INTO lic_policy_details (
      policy_no, fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
      plan_name, start_date, end_date, mode_of_payment, next_premium_date, sum_assured,
      policy_term, premium_term, premium, maturity_value, nominee_name, nominee_relation,
      height_cm, weight_kg, health_lifestyle, bank_account, ifsc_code, bank_name,
      agent_code, branch_code, status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  db.run(sql, [
    policy_no, fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
    plan_name, start_date, end_date, mode_of_payment, next_premium_date, sum_assured,
    policy_term, premium_term, premium, maturity_value, nominee_name, nominee_relation,
    height_cm, weight_kg, health_lifestyle, bank_account, ifsc_code, bank_name,
    agent_code, branch_code, status
  ], function(err) {
    if (err) {
      console.error("❌ Failed to insert policy:", err.message);
      return res.status(500).json({ error: "Failed to add policy" });
    }

    res.json({ success: true, policy_id: this.lastID });
  });
});

// === Get All Policies ===
router.get('/list', (req, res) => {
  const db = req.app.locals.db;

  db.all(`SELECT * FROM lic_policy_details ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch policies:", err.message);
      return res.status(500).json({ error: "Failed to fetch policies" });
    }

    res.json(rows);
  });
});

// === Delete Policy ===
router.delete('/delete/:id', (req, res) => {
  const db = req.app.locals.db;
  db.run(`DELETE FROM lic_policy_details WHERE id = ?`, [req.params.id], function(err) {
    if (err) {
      console.error("❌ Failed to delete policy:", err.message);
      return res.status(500).json({ error: "Failed to delete policy" });
    }
    res.json({ success: true });
  });
});

module.exports = router;
