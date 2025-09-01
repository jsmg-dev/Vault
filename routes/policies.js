const express = require("express");
const router = express.Router();

// === Add New Policy ===
router.post("/add", (req, res) => {
  const db = req.app.locals.db;

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
    INSERT INTO lic_policy_details (
      policy_no, plan_name, start_date, end_date, mode_of_payment, next_premium_date,
      sum_assured, policy_term, premium_term, premium_amount, maturity_value,
      fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
      height_cm, weight_kg, health_lifestyle,
      nominee_name, nominee_relation,
      bank_account, ifsc_code, bank_name,
      agent_code, branch_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    policy_no, plan_name, start_date, end_date, mode_of_payment, next_premium_date,
    sum_assured, policy_term, premium_term, premium_amount, maturity_value,
    fullname, dob, gender, marital_status, aadhaar_pan, email, mobile, address,
    height_cm, weight_kg, health_lifestyle,
    nominee_name, nominee_relation,
    bank_account, ifsc_code, bank_name,
    agent_code, branch_code
  ];

db.run(sql, params, function (err) {
    if (err) {
      console.error("❌ DB Insert Error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: "✅ Policy added successfully", id: this.lastID });
  });
});
// === Get All Policies ===
router.get("/list", (req, res) => {
  const db = req.app.locals.db;
  db.all("SELECT * FROM lic_policy_details", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// === Delete Policy by ID ===
router.delete("/delete/:id", (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  db.run("DELETE FROM lic_policy_details WHERE policy_id = ?", [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Policy deleted successfully", changes: this.changes });
  });
});

module.exports = router;
