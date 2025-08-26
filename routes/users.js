// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ Create a new user (form or API)
router.post('/create', (req, res) => {
  const { name, username, password, role } = req.body;

  // Validation
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check for duplicate username
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }

    if (row) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Insert the new user
    const query = `INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`;
    db.run(query, [name, username, password, role], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Detect if it's a form submission
      const contentType = req.headers['content-type'] || '';
      const isForm = contentType.includes('application/x-www-form-urlencoded');

      if (isForm) {
        // If form submit → redirect
        return res.redirect('/pages/user-management.html');
      }

      // If API call → return JSON
      res.status(201).json({
        message: 'User created successfully',
        userId: this.lastID,
      });
    });
  });
});

// ✅ List all users
router.get('/list', (req, res) => {
  db.all(`SELECT id, name, username, role FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ✅ Delete a user by ID
router.delete('/delete/:id', (req, res) => {
  const userId = req.params.id;

  db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user: ' + err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// ✅ Export router at the very end
module.exports = router;
