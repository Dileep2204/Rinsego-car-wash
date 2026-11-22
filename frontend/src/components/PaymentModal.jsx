import React, { useState } from 'react';
import { apiRequest } from '../api/client';

const METHODS = [
  { id: 'phonepe', label: 'PhonePe UPI', icon: '📱' },
  { id: 'gpay', label: 'Google Pay (GPay)', icon: '🅿️' },
  { id: 'qr', label: 'Scan UPI QR Code (Any UPI App)', icon: '▦', full: true },
  { id: 'credit', label: 'Credit Card', icon: '💳' },
  { id: 'debit', label: 'Debit Card', icon: '🏦' },
];

export default function PaymentModal({ plan, user, onClose, onCompleted, onToast }) {
  const [method, setMethod] = useState('phonepe');
  const [upiId, setUpiId] = useState(`${user?.phone || '9000000001'}@ybl`);
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!plan) return null;

  function selectMethod(m) {
    setMethod(m);
    setError('');
    if (m === 'phonepe') setUpiId(`${user.phone}@ybl`);
    if (m === 'gpay') setUpiId(`${user.phone}@okicici`);
  }

  async function handlePay(e) {
    e.preventDefault();
    setError('');
    if (['credit', 'debit'].includes(method) && cardNum.replace(/\D/g, '').length < 12) {
      setError('Please enter a valid 12 to 16 digit card number.');
      return;
    }

    const labelMap = {
      phonepe: 'PhonePe UPI',
      gpay: 'Google Pay (GPay)',
      qr: 'UPI QR Code Scan',
      credit: 'Credit Card',
      debit: 'Debit Card',
    };

    setProcessing(true);
    try {
      const res = await apiRequest('/customer/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id, method: labelMap[method] }),
      });
      onToast(`Payment of ₹${plan.price} confirmed via ${labelMap[method]} (${res.payment.id})! ${plan.name} Plan activated.`);
      onCompleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>&#10005;</button>
        <span className="eyebrow">SECURE PAYMENT GATEWAY</span>
        <h2>Complete Subscription Payment.</h2>
        <p>Select your preferred payment method to activate your membership.</p>

        <div className="pay-summary">
          <div>
            <b style={{ fontSize: 15 }}>{plan.name} Membership Plan</b>
            <small style={{ display: 'block', color: '#5e707d' }}>{plan.washes} Doorstep Washes / 30 Days</small>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ font: '800 22px Manrope', color: '#0b1c2e' }}>₹{Number(plan.price).toLocaleString('en-IN')}</strong>
            <small style={{ display: 'block', fontSize: 10, color: '#0e9d7e', fontWeight: 700 }}>INCL. GST</small>
          </div>
        </div>

        <div className="pay-methods">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pay-method-btn ${m.full ? 'full-span' : ''} ${method === m.id ? 'active' : ''}`}
              onClick={() => selectMethod(m.id)}
            >
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        {error && <div className="alert-error">{error}</div>}

        {['phonepe', 'gpay'].includes(method) && (
          <form className="clean-form" onSubmit={handlePay}>
            <label>
              {method === 'phonepe' ? 'PhonePe UPI ID or Mobile Number' : 'Google Pay (GPay) UPI ID'}
              <input required value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </label>
            <button type="submit" className="btn primary full" disabled={processing}>
              Pay ₹{Number(plan.price).toLocaleString('en-IN')} via {method === 'phonepe' ? 'PhonePe' : 'Google Pay'} →
            </button>
          </form>
        )}

        {method === 'qr' && (
          <form className="clean-form" onSubmit={handlePay}>
            <div className="qr-box">
              <span className="eyebrow">SCAN WITH PHONEPE / GPAY / PAYTM</span>
              <svg viewBox="0 0 120 120" aria-label="UPI QR Code">
                <rect x="8" y="8" width="32" height="32" fill="none" stroke="#071321" strokeWidth="6" />
                <rect x="16" y="16" width="16" height="16" fill="#071321" />
                <rect x="80" y="8" width="32" height="32" fill="none" stroke="#071321" strokeWidth="6" />
                <rect x="88" y="16" width="16" height="16" fill="#071321" />
                <rect x="8" y="80" width="32" height="32" fill="none" stroke="#071321" strokeWidth="6" />
                <rect x="16" y="88" width="16" height="16" fill="#071321" />
                <rect x="50" y="12" width="10" height="10" fill="#0e9d7e" />
                <rect x="50" y="30" width="18" height="10" fill="#071321" />
                <rect x="14" y="52" width="22" height="10" fill="#071321" />
                <rect x="48" y="50" width="24" height="24" fill="#0e9d7e" />
                <rect x="82" y="52" width="28" height="10" fill="#071321" />
                <rect x="52" y="84" width="16" height="26" fill="#071321" />
                <rect x="78" y="78" width="14" height="14" fill="#0e9d7e" />
                <rect x="96" y="94" width="16" height="16" fill="#071321" />
              </svg>
              <b style={{ display: 'block', fontSize: 12 }}>UPI ID: rinsego.care@icici</b>
              <small style={{ color: '#6d7b8a', fontSize: 11 }}>Scan QR code in your UPI app, then click Confirm Payment below.</small>
            </div>
            <button type="submit" className="btn primary full" disabled={processing}>
              Confirm ₹{Number(plan.price).toLocaleString('en-IN')} QR Payment →
            </button>
          </form>
        )}

        {['credit', 'debit'].includes(method) && (
          <form className="clean-form" onSubmit={handlePay}>
            <label>Cardholder Name<input required value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Name printed on card" /></label>
            <label>{method === 'credit' ? 'Credit Card Number' : 'Debit Card Number'}<input maxLength={19} required value={cardNum} onChange={(e) => setCardNum(e.target.value)} placeholder="4532 •••• •••• 8890" /></label>
            <div className="form-row">
              <label>Expiry (MM/YY)<input maxLength={5} required value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="08/29" /></label>
              <label>CVV<input type="password" maxLength={4} required value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="•••" /></label>
            </div>
            <button type="submit" className="btn primary full" disabled={processing}>
              Pay ₹{Number(plan.price).toLocaleString('en-IN')} via {method === 'credit' ? 'Credit' : 'Debit'} Card →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
