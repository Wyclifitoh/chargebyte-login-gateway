const mysql = require('mysql2/promise');
require('dotenv').config();

const TABLES = `
-- System Users (replaces users + user_roles)
CREATE TABLE IF NOT EXISTS system_users (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) DEFAULT NULL,
  role ENUM('super_admin','staff','location_partner','funding_partner','ad_client','system') NOT NULL,
  partner_id VARCHAR(36) DEFAULT NULL,
  partner_type VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_verified TINYINT(1) DEFAULT 0,
  last_login TIMESTAMP NULL DEFAULT NULL,
  login_attempts INT DEFAULT 0,
  lock_until TIMESTAMP NULL DEFAULT NULL,
  permissions JSON DEFAULT '[]',
  preferences JSON DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY idx_email (email),
  KEY idx_role (role),
  KEY idx_partner (partner_id),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_token (token(255)),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CB Stations (operational stations with coordinates)
CREATE TABLE IF NOT EXISTS cb_stations (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  county_id INT DEFAULT 12,
  county_name VARCHAR(100) DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  features JSON DEFAULT NULL,
  open_hours VARCHAR(50) DEFAULT '24/7',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  host_partner_id VARCHAR(36) DEFAULT NULL,
  revenue_share_percent DECIMAL(5,2) DEFAULT 30.00,
  PRIMARY KEY (id),
  KEY idx_location (latitude, longitude),
  KEY idx_active (is_active),
  KEY idx_station_host (host_partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stations (dashboard/reporting stations with summary data)
CREATE TABLE IF NOT EXISTS stations (
  id INT NOT NULL AUTO_INCREMENT,
  cabinet_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  partner VARCHAR(255) NOT NULL,
  region VARCHAR(100) NOT NULL,
  status ENUM('active','inactive','maintenance') DEFAULT 'active',
  totalSlots INT NOT NULL,
  availableSlots INT NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  rentals INT DEFAULT 0,
  customers INT DEFAULT 0,
  lat DECIMAL(10,6) NOT NULL,
  lng DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  price_per_hour INT DEFAULT 100,
  PRIMARY KEY (id),
  UNIQUE KEY cabinet_id (cabinet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Machines
CREATE TABLE IF NOT EXISTS machines (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  station_id VARCHAR(36) NOT NULL,
  model VARCHAR(36) NOT NULL,
  qr_code VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  total_slots INT DEFAULT 8,
  available_slots INT DEFAULT 8,
  is_available TINYINT(1) DEFAULT 1,
  last_maintenance DATE DEFAULT NULL,
  status ENUM('online','maintenance','offline','faulty') DEFAULT 'online',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY model (model),
  UNIQUE KEY qr_code (qr_code),
  KEY idx_station (station_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Powerbanks
CREATE TABLE IF NOT EXISTS powerbanks (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  machine_id VARCHAR(36) NOT NULL,
  model VARCHAR(100) NOT NULL,
  battery_level INT DEFAULT 100,
  is_available TINYINT(1) DEFAULT 1,
  status ENUM('available','rented','charging','maintenance','faulty','unknown') DEFAULT 'available',
  last_charged TIMESTAMP NULL DEFAULT NULL,
  total_rentals INT DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY model (model),
  KEY idx_machine (machine_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pricing
CREATE TABLE IF NOT EXISTS pricing (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  station_id VARCHAR(36) NOT NULL,
  currency VARCHAR(3) DEFAULT 'Ksh',
  base_price DECIMAL(10,2) DEFAULT 0.00,
  price_per_minute DECIMAL(10,2) DEFAULT 2.00,
  free_minutes INT DEFAULT 60,
  deposit_amount DECIMAL(10,2) DEFAULT 500.00,
  max_daily_charge DECIMAL(10,2) DEFAULT 500.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_station_pricing (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rentals
CREATE TABLE IF NOT EXISTS rentals (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  machine_id VARCHAR(36) NOT NULL,
  powerbank_id VARCHAR(36) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  qr_code VARCHAR(100) NOT NULL,
  machine_model VARCHAR(36) NOT NULL,
  manufacturer_trade_no VARCHAR(100) DEFAULT NULL,
  rental_code VARCHAR(50) NOT NULL,
  rental_slot INT DEFAULT 0,
  start_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL DEFAULT NULL,
  duration_minutes INT DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_refunded TINYINT(1) DEFAULT 0,
  deposit_refund_time TIMESTAMP NULL DEFAULT NULL,
  phone_number VARCHAR(36) DEFAULT NULL,
  status ENUM('active','completed','overdue','cancelled') DEFAULT 'active',
  return_station_id VARCHAR(36) DEFAULT NULL,
  return_machine_id VARCHAR(36) DEFAULT NULL,
  return_slot INT DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY rental_code (rental_code),
  KEY idx_user (user_id),
  KEY idx_status (status),
  KEY idx_start_time (start_time),
  KEY machine_id (machine_id),
  KEY station_id (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) DEFAULT NULL,
  transaction_type ENUM('deposit','rental_charge','refund','topup') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  mpesa_receipt VARCHAR(50) DEFAULT NULL,
  phone_number VARCHAR(15) DEFAULT NULL,
  checkout_request_id VARCHAR(100) DEFAULT NULL,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY rental_id (rental_id),
  KEY idx_user (user_id),
  KEY idx_status (status),
  KEY idx_mpesa_receipt (mpesa_receipt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M-Pesa Callbacks
CREATE TABLE IF NOT EXISTS mpesa_callbacks (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  transaction_id VARCHAR(36) DEFAULT NULL,
  merchant_request_id VARCHAR(100) DEFAULT NULL,
  checkout_request_id VARCHAR(100) DEFAULT NULL,
  result_code INT DEFAULT NULL,
  result_desc VARCHAR(255) DEFAULT NULL,
  amount DECIMAL(10,2) DEFAULT NULL,
  mpesa_receipt_number VARCHAR(50) DEFAULT NULL,
  transaction_date VARCHAR(50) DEFAULT NULL,
  phone_number VARCHAR(15) DEFAULT NULL,
  callback_data JSON DEFAULT NULL,
  processed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_checkout_request (checkout_request_id),
  KEY idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partners
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  partner_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  partner_type ENUM('location_host','funding_org','corporate_sponsor','distribution','technology','government','community_org') NOT NULL,
  tier ENUM('bronze','silver','gold','platinum') DEFAULT 'bronze',
  contact_person VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(15) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  website VARCHAR(255) DEFAULT NULL,
  registration_number VARCHAR(100) DEFAULT NULL,
  tax_id VARCHAR(50) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  county_id INT DEFAULT NULL,
  country VARCHAR(50) DEFAULT 'Kenya',
  logo VARCHAR(100) DEFAULT NULL,
  agreement_type ENUM('revenue_share','fixed_rent','grant_funding','sponsorship','pro_bono','hybrid') DEFAULT 'revenue_share',
  revenue_share_percent DECIMAL(5,2) DEFAULT 15.00,
  fixed_monthly_rent DECIMAL(10,2) DEFAULT 0.00,
  grant_amount DECIMAL(10,2) DEFAULT 0.00,
  sponsorship_amount DECIMAL(10,2) DEFAULT 0.00,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE DEFAULT NULL,
  contract_document_url VARCHAR(500) DEFAULT NULL,
  location_type ENUM('restaurant','hospital','mall','hotel','school','office','other') DEFAULT NULL,
  location_capacity INT DEFAULT 0,
  location_photos JSON DEFAULT NULL,
  funding_purpose VARCHAR(255) DEFAULT NULL,
  grant_period VARCHAR(50) DEFAULT NULL,
  reporting_requirements TEXT DEFAULT NULL,
  has_dashboard_access TINYINT(1) DEFAULT 0,
  dashboard_username VARCHAR(100) DEFAULT NULL,
  dashboard_password_hash VARCHAR(255) DEFAULT NULL,
  last_login TIMESTAMP NULL DEFAULT NULL,
  status ENUM('active','pending','suspended','terminated') DEFAULT 'active',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY partner_code (partner_code),
  KEY idx_partner_type (partner_type),
  KEY idx_county (county_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner Stations
CREATE TABLE IF NOT EXISTS partner_stations (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id VARCHAR(36) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  agreement_type ENUM('revenue_share','fixed_rent','commission') DEFAULT 'revenue_share',
  revenue_share_percent DECIMAL(5,2) DEFAULT 15.00,
  fixed_monthly_amount DECIMAL(10,2) DEFAULT 0.00,
  commission_per_rental DECIMAL(10,2) DEFAULT 0.00,
  total_rentals INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  partner_share_amount DECIMAL(10,2) DEFAULT 0.00,
  last_calculated_date DATE DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_partner_station (partner_id, station_id),
  KEY station_id (station_id),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Partner Payouts
CREATE TABLE IF NOT EXISTS partner_payouts (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id VARCHAR(36) NOT NULL,
  payout_type ENUM('revenue_share','grant_disbursement','sponsorship','commission') NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payout_date DATE DEFAULT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  partner_share_percent DECIMAL(5,2) NOT NULL,
  partner_share_amount DECIMAL(10,2) NOT NULL,
  deductions DECIMAL(10,2) DEFAULT 0.00,
  net_payout DECIMAL(10,2) NOT NULL,
  payment_method ENUM('mpesa','bank_transfer','cheque','airtel_money') DEFAULT 'mpesa',
  payment_details JSON DEFAULT NULL,
  payment_status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  payment_reference VARCHAR(100) DEFAULT NULL,
  transaction_id VARCHAR(100) DEFAULT NULL,
  station_ids JSON DEFAULT NULL,
  machine_performance JSON DEFAULT NULL,
  statement_url VARCHAR(500) DEFAULT NULL,
  sent_to_partner TINYINT(1) DEFAULT 0,
  viewed_by_partner TINYINT(1) DEFAULT 0,
  partner_feedback TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_status (payment_status),
  KEY idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Events
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  event_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('vendor_paid','organizer_paid','free_attendance','activation_campaign') NOT NULL,
  category ENUM('corporate','festival','market','sports','education','community','activation') DEFAULT 'community',
  status ENUM('draft','upcoming','active','completed','cancelled') DEFAULT 'draft',
  description TEXT DEFAULT NULL,
  location VARCHAR(255) NOT NULL,
  venue_name VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  organizer_id VARCHAR(36) DEFAULT NULL,
  organizer_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(15) NOT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME DEFAULT '09:00:00',
  end_time TIME DEFAULT '17:00:00',
  expected_attendees INT DEFAULT 0,
  actual_attendees INT DEFAULT 0,
  expected_rentals_per_day INT DEFAULT 0,
  pricing_model ENUM('daily_rate','per_rental','revenue_share','free') DEFAULT 'daily_rate',
  daily_rate DECIMAL(10,2) DEFAULT 0.00,
  revenue_share_percent DECIMAL(5,2) DEFAULT 0.00,
  setup_fee DECIMAL(10,2) DEFAULT 0.00,
  transport_cost DECIMAL(10,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  revenue_generated DECIMAL(10,2) DEFAULT 0.00,
  profit_loss DECIMAL(10,2) DEFAULT 0.00,
  machines_allocated INT DEFAULT 0,
  powerbanks_allocated INT DEFAULT 0,
  staff_required INT DEFAULT 0,
  setup_notes TEXT DEFAULT NULL,
  power_source ENUM('grid','generator','solar','mixed') DEFAULT 'grid',
  campaign_villages JSON DEFAULT NULL,
  target_new_users INT DEFAULT 0,
  target_trainings INT DEFAULT 0,
  campaign_partner VARCHAR(100) DEFAULT NULL,
  created_by VARCHAR(36) NOT NULL,
  approved_by VARCHAR(36) DEFAULT NULL,
  approval_date DATE DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY event_code (event_code),
  KEY idx_type (type),
  KEY idx_status (status),
  KEY idx_dates (start_date, end_date),
  KEY idx_organizer (organizer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Event Financials
CREATE TABLE IF NOT EXISTS event_financials (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  event_id VARCHAR(36) NOT NULL,
  total_rental_income DECIMAL(10,2) DEFAULT 0.00,
  sponsorship_income DECIMAL(10,2) DEFAULT 0.00,
  vendor_fees DECIMAL(10,2) DEFAULT 0.00,
  staff_costs DECIMAL(10,2) DEFAULT 0.00,
  transport_costs DECIMAL(10,2) DEFAULT 0.00,
  accommodation_costs DECIMAL(10,2) DEFAULT 0.00,
  marketing_costs DECIMAL(10,2) DEFAULT 0.00,
  misc_costs DECIMAL(10,2) DEFAULT 0.00,
  total_income DECIMAL(10,2) DEFAULT 0.00,
  total_expenses DECIMAL(10,2) DEFAULT 0.00,
  net_profit DECIMAL(10,2) DEFAULT 0.00,
  roi_percentage DECIMAL(5,2) DEFAULT 0.00,
  invoice_number VARCHAR(50) DEFAULT NULL,
  invoice_date DATE DEFAULT NULL,
  payment_status ENUM('pending','partially_paid','fully_paid','overdue') DEFAULT 'pending',
  payment_due_date DATE DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_event_financial (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Event Machines
CREATE TABLE IF NOT EXISTS event_machines (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  event_id VARCHAR(36) NOT NULL,
  machine_id VARCHAR(36) NOT NULL,
  assignment_date DATE NOT NULL,
  return_date DATE DEFAULT NULL,
  status ENUM('assigned','deployed','returned','lost') DEFAULT 'assigned',
  deployed_location VARCHAR(255) DEFAULT NULL,
  deployed_by VARCHAR(36) DEFAULT NULL,
  deployment_notes TEXT DEFAULT NULL,
  rentals_count INT DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_event_machine (event_id, machine_id),
  KEY machine_id (machine_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Event Staff
CREATE TABLE IF NOT EXISTS event_staff (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  event_id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  staff_type ENUM('manager','technician','sales_agent','trainer') DEFAULT 'sales_agent',
  role VARCHAR(100) DEFAULT NULL,
  daily_rate DECIMAL(10,2) DEFAULT 0.00,
  working_days INT DEFAULT 1,
  total_payment DECIMAL(10,2) DEFAULT 0.00,
  new_users_registered INT DEFAULT 0,
  trainings_conducted INT DEFAULT 0,
  rentals_facilitated INT DEFAULT 0,
  check_in_time TIMESTAMP NULL DEFAULT NULL,
  check_out_time TIMESTAMP NULL DEFAULT NULL,
  attendance_hours DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_event_staff (event_id, staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activation Contacts
CREATE TABLE IF NOT EXISTS activation_contacts (
  id INT NOT NULL AUTO_INCREMENT,
  activation_id INT NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  gender ENUM('Male','Female','Other') DEFAULT NULL,
  age_range VARCHAR(20) DEFAULT NULL,
  occupation VARCHAR(100) DEFAULT NULL,
  interests TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  electricity_access TINYINT(1) DEFAULT NULL,
  phone_power_outage TINYINT(1) DEFAULT NULL,
  charge_station_help TINYINT(1) DEFAULT NULL,
  pay_for_charging TINYINT(1) DEFAULT NULL,
  internet_access_frequency TINYINT(1) DEFAULT NULL,
  school_connectivity_awareness TINYINT(1) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY activation_id (activation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activation Locations
CREATE TABLE IF NOT EXISTS activation_locations (
  id INT NOT NULL AUTO_INCREMENT,
  agent_id INT NOT NULL,
  county VARCHAR(100) NOT NULL,
  location_type ENUM('School','Market','Institution') NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  status ENUM('Visited','Scheduled','Cancelled') NOT NULL,
  activity_awareness TINYINT(1) DEFAULT 0,
  activity_training TINYINT(1) DEFAULT 0,
  activity_demo TINYINT(1) DEFAULT 0,
  people_reached INT DEFAULT 0,
  male_count INT DEFAULT 0,
  female_count INT DEFAULT 0,
  phone_contacts INT DEFAULT 0,
  email_contacts INT DEFAULT 0,
  giga_explained TINYINT(1) DEFAULT 0,
  internet_method ENUM('WiFi','Powerbank','Both') DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  visit_date DATE NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY agent_id (agent_id),
  KEY county (county),
  KEY status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activation Stats Daily
CREATE TABLE IF NOT EXISTS activation_stats_daily (
  id INT NOT NULL AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  total_locations INT DEFAULT 0,
  visited_locations INT DEFAULT 0,
  scheduled_locations INT DEFAULT 0,
  people_reached INT DEFAULT 0,
  wifi_count INT DEFAULT 0,
  powerbank_count INT DEFAULT 0,
  records_collected INT DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('low','medium','high') DEFAULT 'low',
  resolved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(36) DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) DEFAULT NULL,
  record_id VARCHAR(36) DEFAULT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_action (user_id, action),
  KEY idx_created_at (created_at)
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

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'chargebyte_db'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    await connection.query(`USE \`${process.env.DB_NAME || 'chargebyte_db'}\``);

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
