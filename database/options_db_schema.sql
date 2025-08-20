-- Option Theta IQ Database Schema
-- Run this after installing PostgreSQL

-- Create database
CREATE DATABASE option_theta_iq;

-- Connect to the database and create tables
\c option_theta_iq;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Base_Position
CREATE TABLE base_position (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    position_name VARCHAR(255) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL, -- 'covered_call', 'pmcc', etc.
    underlying_price DECIMAL(10,2),
    position_status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'assigned'
    total_credits DECIMAL(10,2) DEFAULT 0.00,
    total_debits DECIMAL(10,2) DEFAULT 0.00,
    net_position_value DECIMAL(10,2) GENERATED ALWAYS AS (total_credits - total_debits) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Option
CREATE TABLE option_position (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_position_id UUID NOT NULL REFERENCES base_position(id) ON DELETE CASCADE,
    position_type VARCHAR(20) NOT NULL, -- 'long', 'short'
    option_type VARCHAR(10) NOT NULL, -- 'call', 'put'
    option_action VARCHAR(20) NOT NULL, -- 'buy_to_open', 'sell_to_open', 'buy_to_close', 'sell_to_close'
    strike_price DECIMAL(10,2) NOT NULL,
    expiration_date DATE NOT NULL,
    contracts INTEGER NOT NULL,
    premium_per_contract DECIMAL(10,4) NOT NULL,
    fees_commissions DECIMAL(8,2) DEFAULT 0.00,
    multiplier INTEGER DEFAULT 100,
    option_order_principal DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN option_action IN ('sell_to_open', 'buy_to_close') 
            THEN (premium_per_contract * contracts * multiplier) - fees_commissions
            ELSE -((premium_per_contract * contracts * multiplier) + fees_commissions)
        END
    ) STORED,
    trade_date DATE DEFAULT CURRENT_DATE,
    is_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Stock_Share_Bottom_Position
CREATE TABLE stock_share_position (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_position_id UUID NOT NULL REFERENCES base_position(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL, -- 'buy', 'sell'
    shares INTEGER NOT NULL,
    share_price DECIMAL(10,4) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (shares * share_price) STORED,
    fees_commissions DECIMAL(8,2) DEFAULT 0.00,
    trade_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_base_position_symbol ON base_position(symbol);
CREATE INDEX idx_base_position_status ON base_position(position_status);
CREATE INDEX idx_option_base_position ON option_position(base_position_id);
CREATE INDEX idx_option_expiration ON option_position(expiration_date);
CREATE INDEX idx_stock_base_position ON stock_share_position(base_position_id);

-- Trigger to update base_position totals when options are modified
CREATE OR REPLACE FUNCTION update_base_position_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE base_position 
    SET 
        total_credits = (
            SELECT COALESCE(SUM(option_order_principal), 0)
            FROM option_position 
            WHERE base_position_id = COALESCE(NEW.base_position_id, OLD.base_position_id)
            AND option_order_principal > 0
        ),
        total_debits = (
            SELECT COALESCE(ABS(SUM(option_order_principal)), 0)
            FROM option_position 
            WHERE base_position_id = COALESCE(NEW.base_position_id, OLD.base_position_id)
            AND option_order_principal < 0
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.base_position_id, OLD.base_position_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_base_position_totals
    AFTER INSERT OR UPDATE OR DELETE ON option_position
    FOR EACH ROW
    EXECUTE FUNCTION update_base_position_totals();

-- Sample data for testing
INSERT INTO base_position (symbol, position_name, strategy_type, underlying_price, notes)
VALUES 
    ('AAPL', 'AAPL Covered Call Jan 2024', 'covered_call', 150.00, 'Initial covered call position'),
    ('MSFT', 'MSFT PMCC Strategy', 'pmcc', 300.00, 'Poor man covered call setup');

-- Sample options
INSERT INTO option_position (base_position_id, position_type, option_type, option_action, strike_price, expiration_date, contracts, premium_per_contract)
SELECT 
    id,
    'short',
    'call', 
    'sell_to_open',
    155.00,
    '2024-01-19',
    1,
    2.50
FROM base_position WHERE symbol = 'AAPL' LIMIT 1;