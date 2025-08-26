// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // make sure this points to your SQLite connection

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Check user in database
  const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.get(sql, [username, password], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Save role in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return res.json({
      message: 'Login successful',
      role: user.role
    });
  });
});

// GET /auth/me → return logged-in user details
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  res.json(req.session.user);
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/'); // back to login page
  });
});

module.exports = router;
