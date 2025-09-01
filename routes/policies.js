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

// === Update Policy ===
router.put("/update/:id", (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const data = req.body;

  const sql = `
    UPDATE lic_policy_details SET
      policy_no=?, plan_name=?, start_date=?, end_date=?, mode_of_payment=?, next_premium_date=?,
      sum_assured=?, policy_term=?, premium_term=?, premium_amount=?, maturity_value=?,
      fullname=?, dob=?, gender=?, marital_status=?, aadhaar_pan=?, email=?, mobile=?, address=?,
      height_cm=?, weight_kg=?, health_lifestyle=?, nominee_name=?, nominee_relation=?,
      bank_account=?, ifsc_code=?, bank_name=?, agent_code=?, branch_code=?
    WHERE policy_id=?
  `;

  const params = [
    data.policy_no, data.plan_name, data.start_date, data.end_date, data.mode_of_payment, data.next_premium_date,
    data.sum_assured, data.policy_term, data.premium_term, data.premium_amount, data.maturity_value,
    data.fullname, data.dob, data.gender, data.marital_status, data.aadhaar_pan, data.email, data.mobile, data.address,
    data.height_cm, data.weight_kg, data.health_lifestyle, data.nominee_name, data.nominee_relation,
    data.bank_account, data.ifsc_code, data.bank_name, data.agent_code, data.branch_code, id
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Policy not found" });
    res.json({ success: true, updatedId: id });
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
