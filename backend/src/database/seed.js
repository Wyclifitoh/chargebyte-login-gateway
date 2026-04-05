const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chargebyte_db'
    });

    const hash = await bcrypt.hash('ChargeByte2024!', 12);

    // Users
    const users = [
      { id: uuidv4(), name: 'Alex Rivera', email: 'superadmin@chargebyte.com', role: 'super_admin' },
      { id: uuidv4(), name: 'Jordan Lee', email: 'admin@chargebyte.com', role: 'admin' },
      { id: uuidv4(), name: 'Sam Chen', email: 'staff@chargebyte.com', role: 'staff' },
      { id: uuidv4(), name: 'Morgan Blake', email: 'partner@chargebyte.com', role: 'location_partner' },
      { id: uuidv4(), name: 'Taylor Swift', email: 'adclient@chargebyte.com', role: 'advertising_client' }
    ];

    for (const u of users) {
      await connection.query(
        'INSERT IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [u.id, u.name, u.email, hash]
      );
      await connection.query(
        'INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [uuidv4(), u.id, u.role]
      );
    }

    // Stations
    const stations = [
      { id: uuidv4(), name: 'Westlands Hub', address: 'Westlands Rd, Nairobi', county_name: 'Nairobi', open_hours: '24/7', revenue_share_percent: 15 },
      { id: uuidv4(), name: 'CBD Central', address: 'Kenyatta Ave, Nairobi', county_name: 'Nairobi', open_hours: '6AM-11PM', revenue_share_percent: 12 },
      { id: uuidv4(), name: 'Kilimani Plaza', address: 'Argwings Kodhek Rd', county_name: 'Nairobi', open_hours: '24/7', revenue_share_percent: 18 },
      { id: uuidv4(), name: 'Mombasa Beach', address: 'Nyali Beach Rd', county_name: 'Mombasa', open_hours: '7AM-10PM', revenue_share_percent: 20 }
    ];

    for (const s of stations) {
      await connection.query(
        'INSERT IGNORE INTO cb_stations (id, name, address, county_name, open_hours, revenue_share_percent, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [s.id, s.name, s.address, s.county_name, s.open_hours, s.revenue_share_percent]
      );
    }

    // Machines
    const machineData = [];
    for (const s of stations) {
      for (let i = 1; i <= 3; i++) {
        const mid = uuidv4();
        machineData.push({ id: mid, station_id: s.id, name: `${s.name}-M${i}`, model: 'CB-X' + (i % 2 === 0 ? '200' : '100'), total_slots: 8, available_slots: Math.floor(Math.random() * 8), status: i === 3 ? 'maintenance' : 'online' });
      }
    }
    for (const m of machineData) {
      await connection.query(
        'INSERT IGNORE INTO machines (id, station_id, name, model, qr_code, total_slots, available_slots, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [m.id, m.station_id, m.name, m.model, `QR-${m.id.slice(0,8)}`, m.total_slots, m.available_slots, m.status]
      );
    }

    // Sample rentals, transactions, notifications
    const rentalStatuses = ['active', 'completed', 'overdue', 'cancelled'];
    for (let i = 0; i < 20; i++) {
      const rid = uuidv4();
      const st = stations[i % stations.length];
      const mc = machineData[i % machineData.length];
      const status = rentalStatuses[i % 4];
      const startTime = new Date(Date.now() - Math.random() * 7 * 86400000);
      const endTime = status !== 'active' ? new Date(startTime.getTime() + 3600000) : null;
      await connection.query(
        'INSERT INTO rentals (id, customer_name, customer_phone, station_id, machine_id, powerbank_id, start_time, end_time, total_amount, deposit_amount, deposit_refunded, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [rid, `Customer ${i+1}`, `+2547${String(i).padStart(8,'0')}`, st.id, mc.id, `PB-${1000+i}`, startTime, endTime, 50 + i * 10, 200, status === 'completed' ? 1 : 0, status]
      );

      // Transaction for each rental
      await connection.query(
        'INSERT INTO transactions (id, rental_id, transaction_type, amount, currency, mpesa_receipt, phone_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), rid, 'rental_payment', 50 + i * 10, 'KES', `REC${String(i).padStart(8,'0')}`, `+2547${String(i).padStart(8,'0')}`, status === 'cancelled' ? 'failed' : 'completed']
      );
    }

    // Notifications
    const notifTypes = ['machine_offline', 'maintenance_due', 'low_slots', 'rental_failed', 'revenue_anomaly'];
    const severities = ['info', 'warning', 'critical'];
    for (let i = 0; i < 10; i++) {
      await connection.query(
        'INSERT INTO notifications (id, title, description, type, severity, target_roles) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), `Alert ${i+1}`, `Sample notification description ${i+1}`, notifTypes[i % 5], severities[i % 3], JSON.stringify(['super_admin', 'admin'])]
      );
    }

    // Audit logs
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'];
    for (let i = 0; i < 15; i++) {
      await connection.query(
        'INSERT INTO audit_logs (id, user_id, action, table_name, record_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), users[i % users.length].id, actions[i % 4], 'users', uuidv4(), '192.168.1.' + i, 'Mozilla/5.0']
      );
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
