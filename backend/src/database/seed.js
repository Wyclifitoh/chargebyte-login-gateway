const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "chargebyte_db",
    });

    const hash = await bcrypt.hash("ChargeByte2024!", 12);

    // System Users (single table — no separate user_roles)
    const users = [
      {
        id: uuidv4(),
        full_name: "Alex Rivera",
        email: "superadmin@chargebyte.com",
        role: "super_admin",
        phone: "+254700000001",
      },
      {
        id: uuidv4(),
        full_name: "Sam Chen",
        email: "staff@chargebyte.com",
        role: "staff",
        phone: "+254700000002",
      },
      {
        id: uuidv4(),
        full_name: "Morgan Blake",
        email: "partner@chargebyte.com",
        role: "location_partner",
        phone: "+254700000003",
      },
      {
        id: uuidv4(),
        full_name: "Pat Funder",
        email: "funding@chargebyte.com",
        role: "funding_partner",
        phone: "+254700000004",
      },
      {
        id: uuidv4(),
        full_name: "Taylor Swift",
        email: "adclient@chargebyte.com",
        role: "ad_client",
        phone: "+254700000005",
      },
      {
        id: uuidv4(),
        full_name: "System Bot",
        email: "system@chargebyte.com",
        role: "system",
        phone: null,
      },
    ];

    for (const u of users) {
      await connection.query(
        `INSERT IGNORE INTO system_users
         (id, email, password_hash, full_name, phone, role, is_active, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [u.id, u.email, hash, u.full_name, u.phone, u.role],
      );
    }

    // Stations
    const stations = [
      {
        id: uuidv4(),
        name: "Westlands Hub",
        address: "Westlands Rd, Nairobi",
        county_name: "Nairobi",
        lat: -1.2667,
        lng: 36.8,
        open_hours: "24/7",
        revenue_share_percent: 15,
      },
      {
        id: uuidv4(),
        name: "CBD Central",
        address: "Kenyatta Ave, Nairobi",
        county_name: "Nairobi",
        lat: -1.2864,
        lng: 36.8172,
        open_hours: "6AM-11PM",
        revenue_share_percent: 12,
      },
      {
        id: uuidv4(),
        name: "Kilimani Plaza",
        address: "Argwings Kodhek Rd",
        county_name: "Nairobi",
        lat: -1.29,
        lng: 36.7833,
        open_hours: "24/7",
        revenue_share_percent: 18,
      },
      {
        id: uuidv4(),
        name: "Mombasa Beach",
        address: "Nyali Beach Rd",
        county_name: "Mombasa",
        lat: -4.0435,
        lng: 39.6682,
        open_hours: "7AM-10PM",
        revenue_share_percent: 20,
      },
    ];

    for (const s of stations) {
      await connection.query(
        `INSERT IGNORE INTO cb_stations
         (id, name, address, latitude, longitude, county_name, open_hours, revenue_share_percent, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          s.id,
          s.name,
          s.address,
          s.lat,
          s.lng,
          s.county_name,
          s.open_hours,
          s.revenue_share_percent,
        ],
      );
    }

    // Machines
    const machineData = [];
    for (const s of stations) {
      for (let i = 1; i <= 3; i++) {
        const mid = uuidv4();
        machineData.push({
          id: mid,
          station_id: s.id,
          name: `${s.name}-M${i}`,
          model: "CB-X" + (i % 2 === 0 ? "200" : "100"),
          total_slots: 8,
          available_slots: Math.floor(Math.random() * 8),
          status: i === 3 ? "maintenance" : "online",
        });
      }
    }
    for (const m of machineData) {
      await connection.query(
        `INSERT IGNORE INTO machines
         (id, station_id, name, model, qr_code, total_slots, available_slots, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          m.id,
          m.station_id,
          m.name,
          m.model,
          `QR-${m.id.slice(0, 8)}`,
          m.total_slots,
          m.available_slots,
          m.status,
        ],
      );
    }

    // Sample rentals + transactions (KES)
    const rentalStatuses = ["active", "completed", "overdue", "cancelled"];
    const customerUser = users[0];
    for (let i = 0; i < 20; i++) {
      const rid = uuidv4();
      const st = stations[i % stations.length];
      const mc = machineData[i % machineData.length];
      const status = rentalStatuses[i % 4];
      const startTime = new Date(Date.now() - Math.random() * 7 * 86400000);
      const endTime =
        status !== "active" ? new Date(startTime.getTime() + 3600000) : null;
      const phone = `+2547${String(i).padStart(8, "0")}`;
      const amount = 100 + i * 50; // KES

      await connection.query(
        `INSERT INTO rentals
         (id, user_id, machine_id, station_id, powerbank_id, machine_model, rental_code, rental_slot,
          start_time, end_time, duration_minutes, total_amount, deposit_amount, deposit_refunded,
          phone_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rid,
          customerUser.id,
          mc.id,
          st.id,
          `PB-${1000 + i}`,
          mc.model,
          `RC-${String(i).padStart(6, "0")}`,
          (i % 8) + 1,
          startTime,
          endTime,
          endTime ? 60 : 0,
          amount,
          500,
          status === "completed" ? 1 : 0,
          phone,
          status,
        ],
      );

      await connection.query(
        `INSERT INTO transactions
         (id, user_id, rental_id, transaction_type, amount, currency, mpesa_receipt, phone_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          customerUser.id,
          rid,
          "rental_charge",
          amount,
          "KES",
          `REC${String(i).padStart(8, "0")}`,
          phone,
          status === "cancelled" ? "failed" : "completed",
        ],
      );
    }

    // Notifications
    const priorities = ["low", "medium", "high"];
    for (let i = 0; i < 10; i++) {
      await connection.query(
        `INSERT INTO notifications (title, message, priority, resolved)
         VALUES (?, ?, ?, ?)`,
        [
          `Alert ${i + 1}`,
          `Sample notification description ${i + 1}`,
          priorities[i % 3],
          0,
        ],
      );
    }

    // Audit logs
    const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN"];
    for (let i = 0; i < 15; i++) {
      await connection.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          users[i % users.length].id,
          actions[i % 4],
          "system_users",
          uuidv4(),
          "192.168.1." + i,
          "Mozilla/5.0",
        ],
      );
    }

    console.log("✅ Database seeded successfully");
    console.log("   Default password for all users: ChargeByte2024!");
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
