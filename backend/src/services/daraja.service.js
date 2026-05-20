// backend/src/services/daraja.service.js
// Thin Safaricom Daraja API client. Reads MPESA_* env vars.
// Throws helpful errors instead of swallowing them.

const axios = require("axios");

const ENV = (process.env.MPESA_ENVIRONMENT || "sandbox").toLowerCase();
const BASE =
  ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 30_000) return cachedToken;

  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET not set");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const { data } = await axios.get(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 15_000,
  });
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + Number(data.expires_in || 3599) * 1000;
  return cachedToken;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function password(shortcode, passkey, ts) {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

async function stkPush({ phone, amount, accountRef, description, callbackUrl }) {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("MPESA_SHORTCODE / MPESA_PASSKEY not set");

  const ts = timestamp();
  const body = {
    BusinessShortCode: shortcode,
    Password: password(shortcode, passkey, ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amount)),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: (accountRef || "ChargeByte").slice(0, 12),
    TransactionDesc: (description || "Payment").slice(0, 13),
  };

  const { data } = await axios.post(`${BASE}/mpesa/stkpush/v1/processrequest`, body, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });
  return data;
}

async function b2c({
  phone,
  amount,
  remarks,
  occasion,
  resultUrl,
  queueTimeoutUrl,
  commandId = "BusinessPayment",
}) {
  const token = await getAccessToken();
  const initiator = process.env.MPESA_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;
  const shortcode = process.env.MPESA_SHORTCODE;
  if (!initiator || !securityCredential)
    throw new Error("MPESA_INITIATOR_NAME / MPESA_SECURITY_CREDENTIAL not set");

  const body = {
    InitiatorName: initiator,
    SecurityCredential: securityCredential,
    CommandID: commandId, // SalaryPayment | BusinessPayment | PromotionPayment
    Amount: Math.round(Number(amount)),
    PartyA: shortcode,
    PartyB: phone,
    Remarks: (remarks || "Payment").slice(0, 100),
    QueueTimeOutURL: queueTimeoutUrl,
    ResultURL: resultUrl,
    Occasion: (occasion || "").slice(0, 100),
  };

  const { data } = await axios.post(`${BASE}/mpesa/b2c/v1/paymentrequest`, body, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20_000,
  });
  return data;
}

async function b2b({
  partyB,
  amount,
  remarks,
  accountRef,
  resultUrl,
  queueTimeoutUrl,
  commandId = "BusinessPayBill",
}) {
  const token = await getAccessToken();
  const initiator = process.env.MPESA_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;
  const shortcode = process.env.MPESA_SHORTCODE;
  if (!initiator || !securityCredential)
    throw new Error("MPESA_INITIATOR_NAME / MPESA_SECURITY_CREDENTIAL not set");

  const body = {
    Initiator: initiator,
    SecurityCredential: securityCredential,
    CommandID: commandId, // BusinessPayBill | BusinessBuyGoods | MerchantToMerchantTransfer
    SenderIdentifierType: "4",
    RecieverIdentifierType: "4",
    Amount: Math.round(Number(amount)),
    PartyA: shortcode,
    PartyB: partyB,
    AccountReference: (accountRef || "ChargeByte").slice(0, 13),
    Remarks: (remarks || "Payment").slice(0, 100),
    QueueTimeOutURL: queueTimeoutUrl,
    ResultURL: resultUrl,
  };

  const { data } = await axios.post(`${BASE}/mpesa/b2b/v1/paymentrequest`, body, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20_000,
  });
  return data;
}

async function accountBalance({ resultUrl, queueTimeoutUrl, remarks = "Balance check" }) {
  const token = await getAccessToken();
  const initiator = process.env.MPESA_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;
  const shortcode = process.env.MPESA_SHORTCODE;
  if (!initiator || !securityCredential)
    throw new Error("MPESA_INITIATOR_NAME / MPESA_SECURITY_CREDENTIAL not set");

  const body = {
    Initiator: initiator,
    SecurityCredential: securityCredential,
    CommandID: "AccountBalance",
    PartyA: shortcode,
    IdentifierType: "4",
    Remarks: remarks,
    QueueTimeOutURL: queueTimeoutUrl,
    ResultURL: resultUrl,
  };

  const { data } = await axios.post(`${BASE}/mpesa/accountbalance/v1/query`, body, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20_000,
  });
  return data;
}

module.exports = { getAccessToken, stkPush, b2c, b2b, accountBalance };
