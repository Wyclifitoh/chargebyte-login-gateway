// Seeds initial Super Admin + Admin accounts AND the Chatbite WAP team roster
// as system_users (each gets a login + a printable temporary password).
//
// Usage: node backend/src/database/seed-team.js
//        node backend/src/database/seed-team.js > credentials.txt
//
// All passwords are printed once — capture them and share with the team.

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

function securePassword(len = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  // Ensure complexity
  return out + '!2A';
}

function emailFromName(name) {
  return name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('.') + '@chatbite.io';
}

// Role assignments per requirement: a few core are super_admin / admin, rest staff.
// Consultants & agents are all staff.
const TEAM = [
  // Core (8)
  { full_name: 'Steph Sarah Mukoa',   category: 'core',       title: 'Founder / Operations',         role: 'super_admin' },
  { full_name: 'Wycliff Vuzigu',      category: 'core',       title: 'Founder / Engineering',        role: 'super_admin' },
  { full_name: 'Stephanie Wambui',    category: 'core',       title: 'Operations Lead',              role: 'admin' },
  { full_name: 'Rayna Vohra',         category: 'core',       title: 'Strategy Lead',                role: 'admin' },
  { full_name: 'Ochieng Quinter',     category: 'core',       title: 'Core Team',                    role: 'staff' },
  { full_name: 'Okoth Arnold',        category: 'core',       title: 'Core Team',                    role: 'staff' },
  { full_name: 'Ombeta',              category: 'core',       title: 'Finance & Consulting',         role: 'staff' },
  { full_name: 'John',                category: 'core',       title: 'Graphics & Content Creation',  role: 'staff' },
  // Agents (9)
  { full_name: 'Brian Muturi',        category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Faith Akinyi',        category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Yvonne Darq',         category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Bento Okut',          category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Mary Wamoyo',         category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Wanjiku Marie',       category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Caroline Mariga',     category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Yvonne Kenyo',        category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  { full_name: 'Catherine Pauline',   category: 'agent',      title: 'Field Agent',                  role: 'staff' },
  // Consultants (2) — staff role
  { full_name: 'Elijah Mecha',        category: 'consultant', title: 'Consultant',                   role: 'staff' },
  { full_name: 'Brian Keya',          category: 'consultant', title: 'Consultant',                   role: 'staff' },
];

async function upsertUser(conn, { email, name, role, password }) {
  const hash = await bcrypt.hash(password, 12);
  const [rows] = await conn.query('SELECT id FROM system_users WHERE email = ? LIMIT 1', [email]);
  if (rows.length) {
    await conn.query(
      `UPDATE system_users SET password_hash = ?, full_name = ?, role = ?, is_active = 1, is_verified = 1
       WHERE id = ?`,
      [hash, name, role, rows[0].id]
    );
    return { id: rows[0].id, created: false };
  }
  const id = uuidv4();
  await conn.query(
    `INSERT INTO system_users (id, email, password_hash, full_name, role, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, 1, 1)`,
    [id, email, hash, name, role]
  );
  return { id, created: true };
}

async function upsertTeamMember(conn, m, systemUserId) {
  const [rows] = await conn.query('SELECT id FROM team_members WHERE full_name = ? LIMIT 1', [m.full_name]);
  if (rows.length) {
    await conn.query(
      `UPDATE team_members SET system_user_id = ?, email = ?, category = ?, title = ?, is_active = 1 WHERE id = ?`,
      [systemUserId, emailFromName(m.full_name), m.category, m.title, rows[0].id]
    );
    return { id: rows[0].id, created: false };
  }
  const id = uuidv4();
  await conn.query(
    `INSERT INTO team_members (id, system_user_id, full_name, email, category, title, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, systemUserId, m.full_name, emailFromName(m.full_name), m.category, m.title]
  );
  return { id, created: true };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chargebyte_db',
  });

  try {
    // ---- 1) bootstrap accounts ----
    const saEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@chatbite.io';
    const saPass  = process.env.SEED_SUPER_ADMIN_PASSWORD || securePassword(16);
    const adEmail = process.env.SEED_ADMIN_EMAIL || 'admin@chatbite.io';
    const adPass  = process.env.SEED_ADMIN_PASSWORD || securePassword(16);
    await upsertUser(conn, { email: saEmail, name: 'Super Admin', role: 'super_admin', password: saPass });
    await upsertUser(conn, { email: adEmail, name: 'Admin',       role: 'admin',       password: adPass  });

    // ---- 2) team roster as system_users + team_members ----
    const creds = [];
    for (const m of TEAM) {
      const email = emailFromName(m.full_name);
      const password = securePassword(12);
      const u = await upsertUser(conn, { email, name: m.full_name, role: m.role, password });
      await upsertTeamMember(conn, m, u.id);
      creds.push({ name: m.full_name, email, password, role: m.role, category: m.category });
    }

    // ---- output ----
    const line = '='.repeat(78);
    console.log('\n' + line);
    console.log(' Chatbite WAP — Seed complete. SAVE THESE CREDENTIALS (shown only once).');
    console.log(line);
    console.log('\n[Bootstrap]');
    console.log(`  ${saEmail.padEnd(38)}  ${saPass}   (super_admin)`);
    console.log(`  ${adEmail.padEnd(38)}  ${adPass}   (admin)`);
    console.log('\n[Team — login with email + password]');
    console.log(`  ${'NAME'.padEnd(22)} ${'EMAIL'.padEnd(38)} PASSWORD             ROLE`);
    console.log('  ' + '-'.repeat(96));
    for (const c of creds) {
      console.log(`  ${c.name.padEnd(22)} ${c.email.padEnd(38)} ${c.password.padEnd(20)} ${c.role}`);
    }
    console.log('\n' + line + '\n');
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
