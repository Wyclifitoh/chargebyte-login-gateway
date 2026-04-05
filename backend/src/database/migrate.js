const mysql = require('mysql2/promise');
require('dotenv').config();

const TABLES = `
-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role ENUM('super_admin','admin','staff','location_partner','advertising_client') NOT NULL,
  UNIQUE KEY uk_user_role (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(255)),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stations
CREATE TABLE IF NOT EXISTS cb_stations (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(300),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  county_id VARCHAR(10),
  county_name VARCHAR(100),
  image_url VARCHAR(500),
  features JSON,
  open_hours VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  host_partner_id CHAR(36),
  revenue_share_percent DECIMAL(5,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_partner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_active (is_active),
  INDEX idx_partner (host_partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Machines
CREATE TABLE IF NOT EXISTS machines (
  id CHAR(36) PRIMARY KEY,
  station_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  qr_code VARCHAR(200) UNIQUE,
  total_slots INT DEFAULT 0,
  available_slots INT DEFAULT 0,
  is_available TINYINT(1) DEFAULT 1,
  last_maintenance DATETIME,
  status ENUM('online','offline','maintenance') DEFAULT 'online',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES cb_stations(id) ON DELETE CASCADE,
  INDEX idx_station (station_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rentals
CREATE TABLE IF NOT EXISTS rentals (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  station_id CHAR(36) NOT NULL,
  machine_id CHAR(36) NOT NULL,
  powerbank_id VARCHAR(50),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INT,
  total_amount DECIMAL(10,2) DEFAULT 0,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_refunded TINYINT(1) DEFAULT 0,
  status ENUM('active','completed','overdue','cancelled') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES cb_stations(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  INDEX idx_status (status),
  INDEX idx_station (station_id),
  INDEX idx_dates (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  rental_id CHAR(36),
  transaction_type ENUM('rental_payment','deposit','refund','subscription','penalty') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  mpesa_receipt VARCHAR(50),
  phone_number VARCHAR(20),
  checkout_request_id VARCHAR(100),
  status ENUM('completed','pending','failed') DEFAULT 'pending',
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (transaction_type),
  INDEX idx_mpesa (mpesa_receipt),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M-Pesa Callbacks
CREATE TABLE IF NOT EXISTS mpesa_callbacks (
  id CHAR(36) PRIMARY KEY,
  transaction_id CHAR(36),
  merchant_request_id VARCHAR(100),
  checkout_request_id VARCHAR(100),
  result_code INT,
  result_desc VARCHAR(255),
  amount DECIMAL(10,2),
  mpesa_receipt_number VARCHAR(50),
  transaction_date DATETIME,
  phone_number VARCHAR(20),
  callback_data JSON,
  processed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  INDEX idx_checkout (checkout_request_id),
  INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  client_id CHAR(36),
  client_name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  locations JSON,
  impressions INT DEFAULT 0,
  interactions INT DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  status ENUM('active','completed','scheduled','paused') DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  source VARCHAR(50),
  station_id CHAR(36),
  assigned_to CHAR(36),
  status ENUM('new','contacted','qualified','converted','lost') DEFAULT 'new',
  notes TEXT,
  follow_up_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES cb_stations(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type ENUM('daily','weekly','monthly') NOT NULL,
  station_id CHAR(36),
  submitted_by CHAR(36),
  summary TEXT,
  activities_completed TEXT,
  challenges TEXT,
  next_steps TEXT,
  status ENUM('draft','submitted','reviewed') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES cb_stations(id) ON DELETE SET NULL,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily Plans
CREATE TABLE IF NOT EXISTS daily_plans (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority ENUM('low','medium','high') DEFAULT 'medium',
  deadline DATE,
  is_completed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('machine_offline','machine_faulty','maintenance_due','low_slots','low_health','rental_failed','campaign_ending','mpesa_unprocessed','revenue_anomaly') NOT NULL,
  severity ENUM('info','warning','critical') DEFAULT 'info',
  target_roles JSON,
  related_entity_type VARCHAR(50),
  related_entity_id CHAR(36),
  is_read TINYINT(1) DEFAULT 0,
  dismissed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_read (is_read),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_table (table_name),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'chargebyte_db'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${process.env.DB_NAME || 'chargebyte_db'}\``);

    // Run migrations
    const statements = TABLES.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await connection.query(stmt);
    }

    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
