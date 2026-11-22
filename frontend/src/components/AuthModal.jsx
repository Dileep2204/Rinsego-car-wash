import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

const PRESETS = {
  customer: { phone: '9000000001', pass: 'Customer@123', hint: 'Demo Customer Phone: 9000000001 · Password: Customer@123' },
  worker: { phone: '9000000002', pass: 'Worker@123', hint: 'Demo Worker Phone: 9000000002 · Password: Worker@123' },
  admin: { phone: '9000000003', pass: 'Admin@123', hint: 'Demo Admin Phone: 9000000003 · Password: Admin@123' },
};

export default function AuthModal({ open, initialMode = 'login', initialRole = 'customer', onClose, onSuccess, onToast }) {
  const [tab, setTab] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(PRESETS[initialRole].phone);
  const [password, setPassword] = useState(PRESETS[initialRole].pass);
  const [otpInput, setOtpInput] = useState('');
  const [demoOtpBanner, setDemoOtpBanner] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCar, setRegCar] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [regPass, setRegPass] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    setTab(initialMode);
    handleRoleSelect(initialRole);
  }, [initialMode, initialRole, open]);

  if (!open) return null;

  function handleRoleSelect(nextRole) {
    setRole(nextRole);
    setStep(1);
    setError('');
    setPhone(PRESETS[nextRole].phone);
    setPassword(PRESETS[nextRole].pass);
  }

  async function handleLoginStep1(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login-step1', {
        method: 'POST',
        body: JSON.stringify({ phone, password, role }),
      });
      setDemoOtpBanner(res.demoOtp);
      setOtpInput('');
      setStep(2);
      onToast(`Verification code ${res.demoOtp} sent to +91 ${phone}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp: otpInput, role }),
      });
      localStorage.setItem('rinsego_token', res.token);
      localStorage.setItem('rinsego_user', JSON.stringify(res.user));
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          email: regEmail,
          address: regAddress,
          car: regCar,
          plate: regPlate,
          password: regPass,
        }),
      });
      localStorage.setItem('rinsego_token', res.token);
      localStorage.setItem('rinsego_user', JSON.stringify(res.user));
      onToast(`Fresh customer workspace created for ${res.user.name} (${res.user.phone})!`);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      onToast(res.message);
      setTab('login');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>&#10005;</button>

        {tab === 'login' && (
          <div>
            <span className="eyebrow">ACCOUNT ACCESS</span>
            <h2>Login to RinseGo.</h2>
            <p>Enter your 10-digit phone number and password.</p>

            <div className="role-switch">
              {['customer', 'worker', 'admin'].map((r) => (
                <button key={r} type="button" className={role === r ? 'active' : ''} onClick={() => handleRoleSelect(r)}>
                  {r}
                </button>
              ))}
            </div>

            {error && <div className="alert-error">{error}</div>}

            {step === 1 ? (
              <form className="clean-form" onSubmit={handleLoginStep1}>
                <label>
                  Phone Number
                  <input type="tel" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </label>
                <label>
                  Password
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="link-btn" onClick={() => setTab('forgot')}>Forgot password? (Backup Email)</button>
                  <button type="button" className="link-btn" onClick={() => setTab('signup')}>New here? Sign Up</button>
                </div>
                <button className="btn primary full" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Verification Code →'}
                </button>
                <div className="demo-hint">{PRESETS[role].hint}</div>
              </form>
            ) : (
              <form className="clean-form" onSubmit={handleVerifyOtp}>
                <div className="otp-box">
                  SMS Verification Code sent to <strong>+91 {phone}</strong>.<br />
                  Demo SMS OTP Code: <strong style={{ fontSize: 15 }}>{demoOtpBanner}</strong>
                </div>
                <label>
                  Enter 6-Digit Verification Code
                  <input className="otp-input" type="tel" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="000000" required />
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button type="button" className="link-btn" onClick={() => setStep(1)}>← Change Phone Number</button>
                  <button type="button" className="link-btn" onClick={handleLoginStep1}>Resend Code</button>
                </div>
                <button className="btn primary full" type="submit" disabled={loading}>Verify &amp; Open Dashboard →</button>
              </form>
            )}
          </div>
        )}

        {tab === 'signup' && (
          <div>
            <span className="eyebrow">CREATE ACCOUNT</span>
            <h2>Sign Up for RinseGo.</h2>
            <p>Register your details below. Your phone number is your login ID, and your email is saved for backup recovery.</p>
            {error && <div className="alert-error">{error}</div>}
            <form className="clean-form" onSubmit={handleSignup}>
              <label>Full Name<input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Karthik Reddy" /></label>
              <div className="form-row">
                <label>Phone Number (Login ID)<input type="tel" maxLength={10} required value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="10-digit phone" /></label>
                <label>Backup Email (Recovery Only)<input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" /></label>
              </div>
              <label>Doorstep Address<input type="text" required value={regAddress} onChange={(e) => setRegAddress(e.target.value)} placeholder="Flat / House No, Street, Area" /></label>
              <div className="form-row">
                <label>Vehicle Model (Optional)<input type="text" value={regCar} onChange={(e) => setRegCar(e.target.value)} placeholder="e.g. Hyundai Creta" /></label>
                <label>Vehicle Reg. No.<input type="text" value={regPlate} onChange={(e) => setRegPlate(e.target.value)} placeholder="e.g. AP16AB1234" /></label>
              </div>
              <label>Create Password (min 6 characters)<input type="password" minLength={6} required value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="Choose a password" /></label>
              <button className="btn primary full" type="submit" disabled={loading}>Create Account &amp; Continue →</button>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button type="button" className="link-btn" onClick={() => setTab('login')}>Already have an account? Login</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'forgot' && (
          <div>
            <span className="eyebrow">BACKUP EMAIL RECOVERY</span>
            <h2>Recover Password.</h2>
            <p>Enter your registered backup email address to receive a password reset link.</p>
            {error && <div className="alert-error">{error}</div>}
            <form className="clean-form" onSubmit={handleForgot}>
              <label>Registered Backup Email<input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="customer@rinsego.demo" /></label>
              <button className="btn primary full" type="submit">Send Recovery Link →</button>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button type="button" className="link-btn" onClick={() => setTab('login')}>Back to Login</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
