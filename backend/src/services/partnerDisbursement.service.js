// partnerDisbursement.service.js
// Compute + insert partner disbursement vouchers.
// Idempotent — unique key (partner_id, station_id, period_start).
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

function periodBoundsFor(freq, refDate = new Date()) {
  const d = new Date(refDate);
  if (freq === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    return { start, end };
  }
  if (freq === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3);
    const start = new Date(d.getFullYear(), (q - 1) * 3, 1);
    const end = new Date(d.getFullYear(), q * 3, 0);
    return { start, end };
  }
  return { start: new Date(d.getFullYear() - 1, 0, 1), end: new Date(d.getFullYear() - 1, 11, 31) };
}

function fmtDate(d) { return d.toISOString().slice(0, 10); }

function partnerRentalWindowFromSql() {
  return `FROM partner_machine_deployments pmd
     JOIN machines dm ON dm.id = pmd.machine_id
     JOIN rentals r
       ON (
         r.machine_id = pmd.machine_id
         OR NULLIF(r.machine_id, '') = dm.cabinet_device_id
         OR NULLIF(r.machine_id, '') = dm.manufacturer_cabinet_id
         OR NULLIF(r.manufacturer_trade_no, '') = dm.cabinet_device_id
         OR NULLIF(r.manufacturer_trade_no, '') = dm.manufacturer_cabinet_id
         OR (r.machine_model = dm.model AND NOT EXISTS (SELECT 1 FROM machines mx WHERE mx.id = r.machine_id))
       )
      AND COALESCE(r.start_time, r.created_at) >= pmd.deployed_at
      AND (pmd.undeployed_at IS NULL OR COALESCE(r.start_time, r.created_at) < pmd.undeployed_at)`;
}

// Per-machine disbursement.
// Idempotency key is (partner_id, station_id, period_start) where station_id
// column now stores the machine_id (station is no longer part of the relationship).
async function computeAndInsert({ partnerUserId, machineId, periodStart, periodEnd }) {
  const [[partner]] = await db.query(
    `SELECT u.id AS user_id, p.id AS partner_id, p.agreement_type,
            p.revenue_share_percent, p.fixed_monthly_rent AS fixed_amount,
            p.disbursement_frequency, p.disbursement_day
     FROM system_users u LEFT JOIN partners p ON p.user_id = u.id
     WHERE u.id = ? AND u.role = 'location_partner'`, [partnerUserId]);
  if (!partner || !partner.partner_id) return { ok: false, error: 'partner not found' };

  const [[agg]] = await db.query(
    `SELECT COUNT(DISTINCT r.id) AS rentals_count, COALESCE(SUM(r.total_amount),0) AS gross
     ${partnerRentalWindowFromSql()}
     WHERE pmd.partner_user_id = ?
       AND pmd.machine_id = ?
       AND r.status = 'completed'
       AND r.created_at >= ?
       AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [partnerUserId, machineId, periodStart, periodEnd]);

  const [[deployments]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM partner_machine_deployments
     WHERE partner_user_id = ? AND machine_id = ?
       AND deployed_at < DATE_ADD(?, INTERVAL 1 DAY)
       AND (undeployed_at IS NULL OR undeployed_at >= ?)`,
    [partnerUserId, machineId, periodEnd, periodStart]);
  if (!Number(deployments.count)) return { ok: false, error: 'machine not deployed to this partner in period' };

  const gross = Number(agg.gross);

  let amount, sharePercent = null, fixed = null;
  if (partner.agreement_type === 'fixed_rent') {
    fixed = Number(partner.fixed_amount || 0);
    amount = fixed;
  } else {
    sharePercent = Number(partner.revenue_share_percent || 0);
    amount = Math.round((gross * sharePercent) / 100 * 100) / 100;
  }

  const id = uuidv4();
  try {
    await db.query(
      `INSERT INTO partner_disbursements
        (id, partner_user_id, partner_id, station_id, agreement_type,
         period_start, period_end, gross_revenue, share_percent, fixed_amount, amount_payable, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 7 DAY))`,
      [id, partnerUserId, partner.partner_id, machineId,
       partner.agreement_type === 'fixed_rent' ? 'fixed' : 'revenue_share',
       periodStart, periodEnd, gross, sharePercent, fixed, amount, periodEnd]);
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') return { ok: false, error: 'already exists for this period' };
    throw e;
  }
  return { ok: true, disbursement: { id, partner_user_id: partnerUserId, machine_id: machineId,
    period_start: periodStart, period_end: periodEnd, gross_revenue: gross, amount_payable: amount }};
}

async function runScheduledDisbursements(now = new Date()) {
  const day = now.getDate();
  const [rows] = await db.query(
    `SELECT u.id AS user_id, p.disbursement_frequency
     FROM system_users u JOIN partners p ON p.user_id = u.id
     WHERE u.role='location_partner' AND u.is_active = 1
       AND (p.status IS NULL OR p.status = 'active')
       AND p.disbursement_day = ?`, [day]);
  const results = [];
  for (const r of rows) {
    const { start, end } = periodBoundsFor(r.disbursement_frequency, now);
    const [machines] = await db.query(
      `SELECT DISTINCT machine_id FROM partner_machine_deployments
       WHERE partner_user_id = ? AND deployed_at <= ?
         AND (undeployed_at IS NULL OR undeployed_at >= ?)`,
      [r.user_id, end, start]);
    for (const m of machines) {
      const out = await computeAndInsert({
        partnerUserId: r.user_id, machineId: m.machine_id,
        periodStart: fmtDate(start), periodEnd: fmtDate(end) });
      results.push({ user_id: r.user_id, machine_id: m.machine_id, out });
    }
  }
  return results;
}

function startScheduler() {
  if (process.env.ENABLE_PARTNER_CRON === 'false') return;
  const HOUR = 60 * 60 * 1000;
  let lastRunDay = null;
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 2) return;
    const key = now.toISOString().slice(0, 10);
    if (lastRunDay === key) return;
    lastRunDay = key;
    try {
      const res = await runScheduledDisbursements(now);
      if (res.length) console.log(`[disbursements] generated ${res.length} vouchers`);
    } catch (e) { console.error('[disbursements]', e.message); }
  }, HOUR);
}

module.exports = { computeAndInsert, runScheduledDisbursements, startScheduler, periodBoundsFor };