// server.js - Main Express server
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'option_theta_iq',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// ROUTES

// Base Position Routes
app.get('/api/base-positions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bp.*, 
             COUNT(op.id) as option_count,
             COUNT(ssp.id) as stock_count
      FROM base_position bp
      LEFT JOIN option_position op ON bp.id = op.base_position_id
      LEFT JOIN stock_share_position ssp ON bp.id = ssp.base_position_id
      GROUP BY bp.id
      ORDER BY bp.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/base-positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const basePositionResult = await pool.query(
      'SELECT * FROM base_position WHERE id = $1',
      [id]
    );
    
    if (basePositionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const optionsResult = await pool.query(
      'SELECT * FROM option_position WHERE base_position_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const stocksResult = await pool.query(
      'SELECT * FROM stock_share_position WHERE base_position_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      ...basePositionResult.rows[0],
      options: optionsResult.rows,
      stocks: stocksResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/base-positions', async (req, res) => {
  try {
    const { symbol, strategy_type, underlying_price, notes } = req.body;
    const position_name = `${symbol} ${strategy_type} ${new Date().toLocaleDateString()}`;
    
    const result = await pool.query(
      `INSERT INTO base_position (symbol, position_name, strategy_type, underlying_price, notes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [symbol, position_name, strategy_type, underlying_price, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/base-positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, position_name, strategy_type, underlying_price, position_status, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE base_position 
       SET symbol = $1, position_name = $2, strategy_type = $3, 
           underlying_price = $4, position_status = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [symbol, position_name, strategy_type, underlying_price, position_status, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/base-positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM base_position WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json({ message: 'Position deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Option Position Routes
app.get('/api/options', async (req, res) => {
  try {
    const { base_position_id } = req.query;
    let query = 'SELECT * FROM option_position';
    let params = [];
    
    if (base_position_id) {
      query += ' WHERE base_position_id = $1';
      params.push(base_position_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/options', async (req, res) => {
  try {
    const {
      base_position_id, position_type, option_type, option_action,
      strike_price, expiration_date, contracts, premium_per_contract,
      fees_commissions, trade_date
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO option_position (
        base_position_id, position_type, option_type, option_action,
        strike_price, expiration_date, contracts, premium_per_contract,
        fees_commissions, trade_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        base_position_id, position_type, option_type, option_action,
        strike_price, expiration_date, contracts, premium_per_contract,
        fees_commissions, trade_date
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      position_type, option_type, option_action, strike_price,
      expiration_date, contracts, premium_per_contract, fees_commissions,
      trade_date, is_open
    } = req.body;
    
    const result = await pool.query(
      `UPDATE option_position SET
        position_type = $1, option_type = $2, option_action = $3,
        strike_price = $4, expiration_date = $5, contracts = $6,
        premium_per_contract = $7, fees_commissions = $8, trade_date = $9,
        is_open = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [
        position_type, option_type, option_action, strike_price,
        expiration_date, contracts, premium_per_contract, fees_commissions,
        trade_date, is_open, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM option_position WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    res.json({ message: 'Option deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stock Share Position Routes
app.get('/api/stocks', async (req, res) => {
  try {
    const { base_position_id } = req.query;
    let query = 'SELECT * FROM stock_share_position';
    let params = [];
    
    if (base_position_id) {
      query += ' WHERE base_position_id = $1';
      params.push(base_position_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    const {
      base_position_id, action, shares, share_price,
      fees_commissions, trade_date
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO stock_share_position (
        base_position_id, action, shares, share_price, fees_commissions, trade_date
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [base_position_id, action, shares, share_price, fees_commissions, trade_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard/Analytics Routes
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_positions,
        COUNT(CASE WHEN position_status = 'open' THEN 1 END) as open_positions,
        COUNT(CASE WHEN position_status = 'closed' THEN 1 END) as closed_positions,
        COALESCE(SUM(net_position_value), 0) as total_net_value,
        COALESCE(SUM(total_credits), 0) as total_credits,
        COALESCE(SUM(total_debits), 0) as total_debits
      FROM base_position
    `;
    
    const result = await pool.query(overviewQuery);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;