// backend/src/controllers/mpesa.controller.js
// Super-admin only M-Pesa operations. PIN required for outgoing payments.

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const daraja = require('../services/daraja.service');

const callbackBase = () => (process.env.MPESA_CALLBACK_BASE_URL || '').replace(/\/$/, '');

async function logAudit(req, action, table, recordId, payload) {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, action, table, recordId || null, payload ? JSON.stringify(payload) : null, req.ip || null, req.get('User-Agent') || '']
    );
  } catch (e) { /* don't fail main op */ }
}

async function verifyPin(userId, pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) return { ok: false, error: 'PIN must be 4 digits' };
  const [rows] = await db.query('SELECT transaction_pin_hash FROM system_users WHERE id = ?', [userId]);
  if (!rows.length || !rows[0].transaction_pin_hash) return { ok: false, error: 'No PIN set. Set your transaction PIN in profile first.' };
  const ok = await bcrypt.compare(String(pin), rows[0].transaction_pin_hash);
  return { ok, error: ok ? null : 'Invalid PIN' };
}

// ---------- Incoming (C2B / STK) — read from existing transactions/mpesa_callbacks ----------
exports.listIncoming = async (req, res, next) => {
  try {
    const { date_from, date_to, status, search, page = 1, limit = 50 } = req.query;
    const conds = []; const vals = [];
    conds.push("(t.transaction_type IN ('deposit','rental_charge','topup'))");
    if (status) { conds.push('t.status = ?'); vals.push(status); }
    if (date_from) { conds.push('t.created_at >= ?'); vals.push(date_from); }
    if (date_to)   { conds.push('t.created_at <= ?'); vals.push(date_to); }
    if (search)    { conds.push('(t.phone_number LIKE ? OR t.mpesa_receipt LIKE ?)'); vals.push(`%${search}%`, `%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const lim = Math.min(Number(limit) || 50, 200);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const [[{ total }]] = await db.query(`SELECT COUNT(*) total FROM transactions t ${where}`, vals);
    const [rows] = await db.query(
      `SELECT t.* FROM transactions t ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [...vals, lim, off]
    );
    res.json({ success: true, data: rows, meta: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) } });
  } catch (e) { next(e); }
};

// ---------- Outgoing (B2C / B2B) ----------
exports.listOutgoing = async (req, res, next) => {
  try {
    const { date_from, date_to, payment_type, status, search, page = 1, limit = 50 } = req.query;
    const conds = []; const vals = [];
    if (payment_type) { conds.push('payment_type = ?'); vals.push(payment_type); }
    if (status)       { conds.push('status = ?');       vals.push(status); }
    if (date_from)    { conds.push('created_at >= ?');  vals.push(date_from); }
    if (date_to)      { conds.push('created_at <= ?');  vals.push(date_to); }
    if (search)       { conds.push('(party_b LIKE ? OR mpesa_receipt LIKE ? OR remarks LIKE ?)'); vals.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const lim = Math.min(Number(limit) || 50, 200);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) total FROM mpesa_outgoing ${where}`, vals);
    const [rows] = await db.query(
      `SELECT * FROM mpesa_outgoing ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...vals, lim, off]
    );
    res.json({ success: true, data: rows, meta: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) } });
  } catch (e) { next(e); }
};

// ---------- STK push (charge a customer) ----------
exports.stkPush = async (req, res, next) => {
  try {
    const { phone_number, amount, account_ref, description, pin } = req.body;
    if (!phone_number || !amount) return res.status(400).json({ success: false, error: 'phone_number and amount required' });
    const pinCheck = await verifyPin(req.user.id, pin);
    if (!pinCheck.ok) return res.status(403).json({ success: false, error: pinCheck.error });

    const phone = String(phone_number).replace(/^\+/, '').replace(/^0/, '254');
    const callback = `${callbackBase()}/api/public/mpesa/stk-callback`;
    const result = await daraja.stkPush({
      phone, amount, accountRef: account_ref, description, callbackUrl: callback,
    });
    await logAudit(req, 'MPESA_STK_PUSH', 'mpesa_outgoing', result?.CheckoutRequestID, { phone, amount, result });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(502).json({ success: false, error: e?.response?.data?.errorMessage || e.message });
  }
};

// ---------- B2C (pay an individual) ----------
exports.b2c = async (req, res, next) => {
  try {
    const { phone_number, amount, remarks, occasion, command_id, pin } = req.body;
    if (!phone_number || !amount || !remarks) {
      return res.status(400).json({ success: false, error: 'phone_number, amount and remarks are required' });
    }
    const pinCheck = await verifyPin(req.user.id, pin);
    if (!pinCheck.ok) return res.status(403).json({ success: false, error: pinCheck.error });

    const id = uuidv4();
    const phone = String(phone_number).replace(/^\+/, '').replace(/^0/, '254');
    const resultUrl = `${callbackBase()}/api/public/mpesa/b2c-result?ref=${id}`;
    const timeoutUrl = `${callbackBase()}/api/public/mpesa/b2c-timeout?ref=${id}`;

    const dr = await daraja.b2c({
      phone, amount, remarks, occasion,
      resultUrl, queueTimeoutUrl: timeoutUrl,
      commandId: command_id || 'BusinessPayment',
    });

    await db.query(
      `INSERT INTO mpesa_outgoing
       (id, payment_type, command_id, amount, party_a, party_b, remarks, occasion,
        conversation_id, originator_conversation_id, status, raw_response,
        initiated_by, initiated_by_name, initiated_by_role)
       VALUES (?, 'B2C', ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        id, command_id || 'BusinessPayment', amount, process.env.MPESA_SHORTCODE, phone,
        remarks, occasion || null, dr?.ConversationID || null, dr?.OriginatorConversationID || null,
        JSON.stringify(dr), req.user.id, req.user.name, req.user.role,
      ]
    );
    await logAudit(req, 'MPESA_B2C', 'mpesa_outgoing', id, { phone, amount, remarks });
    res.json({ success: true, data: { id, ...dr } });
  } catch (e) {
    res.status(502).json({ success: false, error: e?.response?.data?.errorMessage || e.message });
  }
};

// ---------- B2B ----------
exports.b2b = async (req, res, next) => {
  try {
    const { party_b, amount, remarks, account_ref, command_id, pin } = req.body;
    if (!party_b || !amount || !remarks) {
      return res.status(400).json({ success: false, error: 'party_b, amount and remarks are required' });
    }
    const pinCheck = await verifyPin(req.user.id, pin);
    if (!pinCheck.ok) return res.status(403).json({ success: false, error: pinCheck.error });

    const id = uuidv4();
    const resultUrl = `${callbackBase()}/api/public/mpesa/b2b-result?ref=${id}`;
    const timeoutUrl = `${callbackBase()}/api/public/mpesa/b2b-timeout?ref=${id}`;

    const dr = await daraja.b2b({
      partyB: party_b, amount, remarks, accountRef: account_ref,
      resultUrl, queueTimeoutUrl: timeoutUrl,
      commandId: command_id || 'BusinessPayBill',
    });

    await db.query(
      `INSERT INTO mpesa_outgoing
       (id, payment_type, command_id, amount, party_a, party_b, remarks,
        conversation_id, originator_conversation_id, status, raw_response,
        initiated_by, initiated_by_name, initiated_by_role)
       VALUES (?, 'B2B', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        id, command_id || 'BusinessPayBill', amount, process.env.MPESA_SHORTCODE, party_b,
        remarks, dr?.ConversationID || null, dr?.OriginatorConversationID || null,
        JSON.stringify(dr), req.user.id, req.user.name, req.user.role,
      ]
    );
    await logAudit(req, 'MPESA_B2B', 'mpesa_outgoing', id, { party_b, amount, remarks });
    res.json({ success: true, data: { id, ...dr } });
  } catch (e) {
    res.status(502).json({ success: false, error: e?.response?.data?.errorMessage || e.message });
  }
};

// ---------- Account balance ----------
exports.fetchBalance = async (req, res, next) => {
  try {
    const resultUrl = `${callbackBase()}/api/public/mpesa/balance-result`;
    const timeoutUrl = `${callbackBase()}/api/public/mpesa/balance-timeout`;
    const dr = await daraja.accountBalance({ resultUrl, queueTimeoutUrl: timeoutUrl });
    await logAudit(req, 'MPESA_BALANCE_QUERY', 'mpesa_balance', null, { result: dr });
    res.json({ success: true, data: dr, message: 'Balance query queued; result will arrive via callback.' });
  } catch (e) {
    res.status(502).json({ success: false, error: e?.response?.data?.errorMessage || e.message });
  }
};

exports.getLatestBalance = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM mpesa_balance ORDER BY fetched_at DESC LIMIT 1'
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (e) { next(e); }
};

// ---------- Callback handlers (invoked by Safaricom — public) ----------
exports.b2cResult = async (req, res) => {
  try {
    const ref = req.query.ref;
    const result = req.body?.Result || req.body;
    const code = Number(result?.ResultCode);
    const desc = String(result?.ResultDesc || '');
    const items = (result?.ResultParameters?.ResultParameter || []).reduce((m, p) => {
      m[p.Key] = p.Value; return m;
    }, {});
    const receipt = items.TransactionReceipt || items.ConversationID || null;
    if (ref) {
      await db.query(
        `UPDATE mpesa_outgoing
           SET status = ?, result_code = ?, result_desc = ?, mpesa_receipt = ?, raw_callback = ?
         WHERE id = ?`,
        [code === 0 ? 'completed' : 'failed', code, desc, receipt, JSON.stringify(req.body), ref]
      );
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch { res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); }
};

exports.balanceResult = async (req, res) => {
  try {
    const result = req.body?.Result || req.body;
    const items = (result?.ResultParameters?.ResultParameter || []).reduce((m, p) => {
      m[p.Key] = p.Value; return m;
    }, {});
    // AccountBalance value example: "Working Account|KES|481000.00|481000.00|0.00|0.00&Float Account|KES|...&..."
    let balance = 0; let currency = 'KES'; let accountType = 'Working Account';
    const raw = String(items.AccountBalance || '');
    const seg = raw.split('&').find((s) => s.toLowerCase().startsWith('working account')) || raw.split('&')[0];
    if (seg) {
      const parts = seg.split('|');
      accountType = parts[0] || accountType;
      currency = parts[1] || currency;
      balance = Number(parts[2]) || 0;
    }
    await db.query(
      'INSERT INTO mpesa_balance (id, shortcode, account_type, balance, currency, raw_response) VALUES (?, ?, ?, ?, ?, ?)',
      [require('uuid').v4(), process.env.MPESA_SHORTCODE, accountType, balance, currency, JSON.stringify(req.body)]
    );
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch { res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); }
};

exports.stkCallback = async (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback || {};
    const items = (cb.CallbackMetadata?.Item || []).reduce((m, p) => { m[p.Name] = p.Value; return m; }, {});
    await db.query(
      `INSERT INTO mpesa_callbacks
       (merchant_request_id, checkout_request_id, result_code, result_desc, amount, mpesa_receipt_number, transaction_date, phone_number, callback_data, processed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        cb.MerchantRequestID || null, cb.CheckoutRequestID || null,
        Number(cb.ResultCode), String(cb.ResultDesc || ''),
        items.Amount || null, items.MpesaReceiptNumber || null,
        items.TransactionDate ? new Date(String(items.TransactionDate).replace(
          /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3 $4:$5:$6'
        )) : new Date(),
        String(items.PhoneNumber || ''), JSON.stringify(req.body),
      ]
    );
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch { res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); }
};

exports.passthroughTimeout = async (req, res) => {
  try { /* could log to audit */ } catch {}
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
};
