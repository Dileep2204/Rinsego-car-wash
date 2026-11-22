import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import PaymentModal from '../components/PaymentModal';

const MENUS = {
  customer: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '✨' },
    { id: 'vehicles', label: 'My Vehicles', icon: '🚗' },
    { id: 'bookings', label: 'Book & Track', icon: '📅' },
    { id: 'history', label: 'Service History & Photos', icon: '📷' },
    { id: 'profile', label: 'Profile Settings', icon: '⚙' },
  ],
  worker: [
    { id: 'jobs', label: 'Assigned Jobs', icon: '🔧' },
    { id: 'photos', label: 'Before & After Upload', icon: '📷' },
    { id: 'completed', label: 'Completed History', icon: '✓' },
  ],
  admin: [
    { id: 'overview', label: 'Admin Overview', icon: '📊' },
    { id: 'bookings', label: 'Booking Management', icon: '📅' },
    { id: 'workers', label: 'Worker Management', icon: '🔧' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'plans', label: 'Subscription Plans', icon: '✨' },
    { id: 'revenue', label: 'Revenue & Payments', icon: '₹' },
  ],
};

export default function Workspace({ user, plans, onUserUpdate, onPlansUpdate, onNavigateWebsite, onLogout, onToast }) {
  const [activeTab, setActiveTab] = useState(MENUS[user.role][0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const [subscription, setSubscription] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [adminData, setAdminData] = useState({ customers: [], workers: [], bookings: [], plans: [], payments: [], activeSubscriptions: 0 });

  const [vReg, setVReg] = useState('');
  const [vModel, setVModel] = useState('');
  const [vType, setVType] = useState('Hatchback');
  const [vColor, setVColor] = useState('');

  const [bVehicle, setBVehicle] = useState('');
  const [bService, setBService] = useState('Standard Exterior + Interior Wash');
  const [bDate, setBDate] = useState('2026-11-24');
  const [bSlot, setBSlot] = useState('Morning (8 AM – 11 AM)');
  const [bAddr, setBAddr] = useState(user.address || '');
  const [bNotes, setBNotes] = useState('');

  const [pName, setPName] = useState(user.name);
  const [pEmail, setPEmail] = useState(user.email);
  const [pAddr, setPAddr] = useState(user.address || '');

  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wZone, setWZone] = useState('Benz Circle Zone');

  async function loadData() {
    try {
      if (user.role === 'customer') {
        const data = await apiRequest('/customer/workspace');
        setSubscription(data.subscription);
        setVehicles(data.vehicles);
        setBookings(data.bookings);
        if (data.vehicles.length > 0 && !bVehicle) {
          setBVehicle(`${data.vehicles[0].model} (${data.vehicles[0].reg})`);
        }
      } else if (user.role === 'worker') {
        const list = await apiRequest('/bookings');
        setAllBookings(list);
      } else if (user.role === 'admin') {
        const overview = await apiRequest('/admin/overview');
        setAdminData(overview);
      }
    } catch (err) {
      onToast(err.message);
    }
  }

  useEffect(() => {
    setActiveTab(MENUS[user.role][0].id);
    loadData();
  }, [user.role, user.phone]);

  async function handleAddVehicle(e) {
    e.preventDefault();
    await apiRequest('/customer/vehicles', {
      method: 'POST',
      body: JSON.stringify({ reg: vReg, model: vModel, type: vType, color: vColor }),
    });
    setVReg(''); setVModel(''); setVColor('');
    onToast('Vehicle added to your garage.');
    loadData();
  }

  async function handleDeleteVehicle(id) {
    await apiRequest(`/customer/vehicles/${id}`, { method: 'DELETE' });
    onToast('Vehicle removed.');
    loadData();
  }

  async function handleCreateBooking(e) {
    e.preventDefault();
    const chosenVehicle = bVehicle || (vehicles[0] ? `${vehicles[0].model} (${vehicles[0].reg})` : '');
    await apiRequest('/customer/bookings', {
      method: 'POST',
      body: JSON.stringify({ vehicle: chosenVehicle, service: bService, date: bDate, slot: bSlot, address: bAddr, instructions: bNotes }),
    });
    setBNotes('');
    onToast('Doorstep wash booked!');
    loadData();
  }

  async function handleCancelBooking(id) {
    await apiRequest(`/customer/bookings/${id}/cancel`, { method: 'PATCH' });
    onToast('Booking cancelled and wash credit restored.');
    loadData();
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const res = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: pName, email: pEmail, address: pAddr }),
    });
    onUserUpdate(res.user);
    onToast('Profile settings saved.');
  }

  async function handleWorkerStatus(id, status) {
    try {
      await apiRequest(`/worker/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onToast(`Job #${id} marked as ${status}.`);
      loadData();
    } catch (err) {
      onToast(err.message);
      if (err.message.includes('photo')) setActiveTab('photos');
    }
  }

  async function handlePhotoUpload(e, id, stage) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    fd.append('stage', stage);
    files.forEach((f) => fd.append('photos', f));
    await apiRequest(`/worker/bookings/${id}/photos`, { method: 'POST', body: fd });
    onToast(`${files.length} ${stage}-wash photo(s) uploaded.`);
    loadData();
  }

  async function handleAssignWorker(bookingId, workerName) {
    await apiRequest(`/admin/bookings/${bookingId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ workerName }),
    });
    onToast(`Assigned ${workerName} to Booking #${bookingId}.`);
    loadData();
  }

  async function handleAddWorker(e) {
    e.preventDefault();
    await apiRequest('/admin/workers', {
      method: 'POST',
      body: JSON.stringify({ name: wName, phone: wPhone, email: wEmail, zone: wZone }),
    });
    setWName(''); setWPhone(''); setWEmail('');
    onToast(`Worker ${wName} added! Login Phone: ${wPhone}`);
    loadData();
  }

  async function handleUpdatePlanPrice(e, planId, newPrice) {
    e.preventDefault();
    await apiRequest(`/admin/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify({ price: Number(newPrice) }),
    });
    onToast(`Plan price updated to ₹${newPrice}.`);
    onPlansUpdate();
    loadData();
  }

  const activeJob = allBookings[0];

  return (
    <div className="workspace-shell">
      <div className="mobile-ws-bar">
        <div className="brand" style={{ color: 'white', fontSize: 20 }}>
          <span className="brand-mark" style={{ width: 32, height: 32 }}>💧</span>
          <span>rinse<span className="brand-accent">go</span></span>
        </div>
        <button type="button" className="burger-btn" onClick={() => setDrawerOpen(!drawerOpen)}>&#9776;</button>
      </div>

      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      <aside className={`workspace-sidebar ${drawerOpen ? 'mobile-open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand" style={{ color: 'white' }}>
            <span className="brand-mark">💧</span>
            <span>rinse<span className="brand-accent">go</span><small>{user.role.toUpperCase()} PORTAL</small></span>
          </div>
          <button type="button" className="burger-btn" style={{ background: '#0f2238', borderColor: '#1d3654', color: 'white' }} onClick={() => setDrawerOpen(false)}>&#10005;</button>
        </div>
        <div className="sidebar-user">
          <b>{user.name}</b>
          <span>Phone: {user.phone}</span>
        </div>
        <nav className="sidebar-nav">
          {MENUS[user.role].map((item) => (
            <button key={item.id} type="button" className={activeTab === item.id ? 'active' : ''} onClick={() => { setActiveTab(item.id); setDrawerOpen(false); }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" className="btn ghost sidebar-logout" onClick={onNavigateWebsite}>🌐 Go to RinseGo Website</button>
          <button type="button" className="btn ghost sidebar-logout" onClick={onLogout}>← Sign out</button>
        </div>
      </aside>

      <div className="workspace-main">
        {user.role === 'customer' && activeTab === 'overview' && (
          <>
            <div className="dash-head">
              <div><span className="eyebrow">CUSTOMER DASHBOARD · {user.phone}</span><h2>Welcome, {user.name}.</h2><p>Your personal doorstep car wash workspace.</p></div>
              <button className="btn primary" onClick={() => setActiveTab('bookings')}>Book a Wash →</button>
            </div>
            <div className="stats-grid-4">
              <div className="dash-card"><span className="eyebrow">ACTIVE PLAN</span><h3>{subscription ? `${subscription.plan_name} Plan` : 'No Active Plan'}</h3><p>{subscription ? `Expires ${subscription.expiry}` : 'Choose a plan to start'}</p></div>
              <div className="dash-card"><span className="eyebrow">REMAINING WASHES</span><h3>{subscription ? `${subscription.remaining} / ${subscription.total}` : '0'}</h3><p>Available wash credits</p></div>
              <div className="dash-card"><span className="eyebrow">COMPLETED WASHES</span><h3>{bookings.filter((b) => b.status === 'Completed').length}</h3><p>Photo-verified services</p></div>
              <div className="dash-card"><span className="eyebrow">REGISTERED CARS</span><h3>{vehicles.length}</h3><p>Saved in your garage</p></div>
            </div>
            <div className="dash-card wide" style={{ marginTop: 18 }}>
              <span className="eyebrow">YOUR SCHEDULED VISITS</span>
              <h3>Bookings ({bookings.length})</h3>
              {bookings.length === 0 ? <p>You have no bookings yet. Add a vehicle and book your first doorstep wash!</p> : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Vehicle</th><th>Service</th><th>Date &amp; Slot</th><th>Worker</th><th>Status</th></tr></thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>#{b.id}</td><td><b>{b.vehicle}</b></td><td>{b.service}</td><td>{b.booking_date} · {b.slot}</td><td>{b.worker_name}</td>
                          <td><span className={`status-badge status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}>{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {user.role === 'customer' && activeTab === 'subscriptions' && (
          <>
            <div className="dash-head"><div><span className="eyebrow">MEMBERSHIP PACKAGES</span><h2>Choose, Renew, or Upgrade Your Plan.</h2><p>Active Plan: <b>{subscription ? `${subscription.plan_name} (${subscription.remaining} washes left)` : 'None (Select a package below)'}</b></p></div></div>
            <div className="plans" style={{ marginTop: 20 }}>
              {plans.map((p) => (
                <article key={p.id} className={`plan ${p.popular ? 'popular' : ''}`}>
                  {p.popular && <div className="popular-tag">MOST POPULAR</div>}
                  <span className="plan-tag">{p.tag}</span>
                  <h3>{p.name}</h3>
                  <div className="price">₹{Number(p.price).toLocaleString('en-IN')}<small> / month</small></div>
                  <div className="plan-divider"></div>
                  <ul>{(p.features || []).map((f, i) => <li key={i}>&#10003; {f}</li>)}</ul>
                  <button className={`btn ${p.popular ? 'primary' : 'outline'} full`} onClick={() => setCheckoutPlan(p)}>
                    {subscription && subscription.plan_name === p.name ? 'Renew Plan' : 'Subscribe Now'} →
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {user.role === 'customer' && activeTab === 'vehicles' && (
          <>
            <div className="dash-head"><div><span className="eyebrow">GARAGE MANAGEMENT</span><h2>Your Vehicles ({vehicles.length}).</h2></div></div>
            <div className="dash-grid">
              <div className="dash-card">
                <h3>Add a New Vehicle</h3>
                <form className="clean-form" onSubmit={handleAddVehicle}>
                  <label>Registration Number<input required value={vReg} onChange={(e) => setVReg(e.target.value)} placeholder="e.g. AP16XY9876" /></label>
                  <label>Vehicle Model<input required value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="e.g. Tata Nexon EV" /></label>
                  <div className="form-row">
                    <label>Type<select value={vType} onChange={(e) => setVType(e.target.value)}><option>Hatchback</option><option>Sedan</option><option>SUV</option><option>Luxury</option></select></label>
                    <label>Color<input required value={vColor} onChange={(e) => setVColor(e.target.value)} placeholder="e.g. White" /></label>
                  </div>
                  <button className="btn primary" type="submit">+ Add Vehicle</button>
                </form>
              </div>
              <div className="dash-card">
                <h3>Saved Vehicles</h3>
                {vehicles.length === 0 ? <p>No cars added to your account yet.</p> : (
                  <div className="item-list">
                    {vehicles.map((v) => (
                      <div key={v.id} className="item-row">
                        <div><b>{v.model}</b> <span className="pill-mini">{v.reg}</span><small style={{ display: 'block', color: '#6d7b8a' }}>{v.type} · {v.color}</small></div>
                        <button className="btn outline small" onClick={() => handleDeleteVehicle(v.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {user.role === 'customer' && activeTab === 'bookings' && (
          <>
            <div className="dash-head"><div><span className="eyebrow">DOORSTEP WASH BOOKING</span><h2>Book &amp; Track Services.</h2></div></div>
            <div className="dash-grid">
              <div className="dash-card">
                <h3>Schedule a Doorstep Wash</h3>
                {vehicles.length === 0 ? (
                  <>
                    <p>You need to add a vehicle before scheduling a doorstep wash.</p>
                    <button className="btn primary" style={{ marginTop: 10 }} onClick={() => setActiveTab('vehicles')}>+ Add Your First Vehicle</button>
                  </>
                ) : (
                  <form className="clean-form" onSubmit={handleCreateBooking}>
                    <label>Select Vehicle<select value={bVehicle} onChange={(e) => setBVehicle(e.target.value)} required>{vehicles.map((v) => <option key={v.id} value={`${v.model} (${v.reg})`}>{v.model} ({v.reg})</option>)}</select></label>
                    <label>Service Package<select value={bService} onChange={(e) => setBService(e.target.value)}><option>Basic Exterior Wash</option><option>Standard Exterior + Interior Wash</option><option>Premium Deep Clean &amp; Wax</option></select></label>
                    <div className="form-row">
                      <label>Date<input type="date" required value={bDate} onChange={(e) => setBDate(e.target.value)} /></label>
                      <label>Time Slot<select value={bSlot} onChange={(e) => setBSlot(e.target.value)}><option>Morning (8 AM – 11 AM)</option><option>Midday (11 AM – 2 PM)</option><option>Afternoon (2 PM – 5 PM)</option><option>Evening (5 PM – 8 PM)</option></select></label>
                    </div>
                    <label>Complete Doorstep Address<input required value={bAddr} onChange={(e) => setBAddr(e.target.value)} /></label>
                    <label>Additional Instructions<input value={bNotes} onChange={(e) => setBNotes(e.target.value)} placeholder="e.g. Gate code or basement slot" /></label>
                    <button className="btn primary full" type="submit">Confirm Booking →</button>
                  </form>
                )}
              </div>
              <div className="dash-card">
                <h3>Your Bookings ({bookings.length})</h3>
                <div className="item-list">
                  {bookings.map((b) => (
                    <div key={b.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <b>#{b.id} · {b.service}</b>
                        <span className={`status-badge status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}>{b.status}</span>
                      </div>
                      <small>{b.vehicle} · {b.booking_date} ({b.slot})</small>
                      <small>Address: {b.address}</small>
                      {['Pending', 'Confirmed', 'Assigned'].includes(b.status) && (
                        <button className="btn outline small" style={{ marginTop: 6 }} onClick={() => handleCancelBooking(b.id)}>Cancel Booking</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {user.role === 'customer' && activeTab === 'history' && (
          <>
            <div className="dash-head"><div><span className="eyebrow">SERVICE PROOF</span><h2>Completed Services &amp; Before/After Photographs.</h2></div></div>
            {bookings.filter((b) => b.status === 'Completed').map((b) => (
              <div key={b.id} className="dash-card wide" style={{ marginTop: 16 }}>
                <span className="eyebrow">BOOKING #{b.id} · {b.booking_date}</span>
                <h3>{b.service} — {b.vehicle}</h3>
                <p>Completed by <b>{b.worker_name}</b> · Status: <b>{b.status}</b></p>
                <div className="dash-grid">
                  <div><b>Before Wash</b><div className="photo-thumbs">{(b.before_photos || []).map((src, i) => <img key={i} src={src} className="proof-img" alt="Before" />)}</div></div>
                  <div><b>After Wash</b><div className="photo-thumbs">{(b.after_photos || []).map((src, i) => <img key={i} src={src} className="proof-img" alt="After" />)}</div></div>
                </div>
              </div>
            ))}
          </>
        )}

        {user.role === 'customer' && activeTab === 'profile' && (
          <div className="dash-card" style={{ maxWidth: 540 }}>
            <span className="eyebrow">PROFILE SETTINGS</span>
            <h3>Account &amp; Backup Recovery Details</h3>
            <form className="clean-form" onSubmit={handleSaveProfile}>
              <label>Phone Number (Primary Login ID)<input disabled value={user.phone} /></label>
              <label>Full Name<input required value={pName} onChange={(e) => setPName(e.target.value)} /></label>
              <label>Backup Email (Recovery Only)<input type="email" required value={pEmail} onChange={(e) => setPEmail(e.target.value)} /></label>
              <label>Default Doorstep Address<input value={pAddr} onChange={(e) => setPAddr(e.target.value)} /></label>
              <button className="btn primary" type="submit">Save Profile Changes</button>
            </form>
          </div>
        )}

        {user.role === 'worker' && activeTab === 'jobs' && activeJob && (
          <>
            <div className="dash-head"><div><span className="eyebrow">WORKER WORKSPACE</span><h2>Assigned Doorstep Jobs.</h2></div></div>
            <div className="stats-grid-4">
              <div className="dash-card"><span className="eyebrow">ASSIGNED TODAY</span><h3>{allBookings.filter((b) => b.status !== 'Completed').length}</h3><p>Active schedule</p></div>
              <div className="dash-card"><span className="eyebrow">COMPLETED JOBS</span><h3>{allBookings.filter((b) => b.status === 'Completed').length}</h3><p>Photo verified</p></div>
              <div className="dash-card"><span className="eyebrow">SERVICE ZONE</span><h3>{user.zone || 'MG Road'}</h3><p>Vijayawada</p></div>
            </div>
            <div className="dash-card wide" style={{ marginTop: 18 }}>
              <h3>Job #{activeJob.id} — {activeJob.vehicle}</h3>
              <p><b>Customer:</b> {activeJob.customer_name} ({activeJob.customer_phone})</p>
              <p><b>Address:</b> {activeJob.address}</p>
              <p><b>Schedule:</b> {activeJob.booking_date} · {activeJob.slot} · <b>Instructions:</b> {activeJob.instructions}</p>
              <p><b>Current Status:</b> <span className={`status-badge status-${activeJob.status.toLowerCase().replace(/\s+/g, '-')}`}>{activeJob.status}</span></p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                <button className="btn outline" onClick={() => handleWorkerStatus(activeJob.id, 'Confirmed')}>Accept Job</button>
                <button className="btn primary" onClick={() => handleWorkerStatus(activeJob.id, 'In Progress')}>Start Service</button>
                <button className="btn primary" onClick={() => handleWorkerStatus(activeJob.id, 'Completed')}>Mark Completed</button>
              </div>
            </div>
          </>
        )}

        {user.role === 'worker' && activeTab === 'photos' && activeJob && (
          <>
            <div className="dash-head"><div><span className="eyebrow">SERVICE PROOF UPLOAD</span><h2>Before &amp; After Wash Photographs.</h2><p>Job #{activeJob.id} ({activeJob.vehicle})</p></div></div>
            <div className="dash-grid">
              <div className="dash-card">
                <h3>1. Before-Wash Photos ({(activeJob.before_photos || []).length})</h3>
                <label className="upload-box">📷 Select Before-Wash Images<input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, activeJob.id, 'before')} /></label>
                <div className="photo-thumbs">{(activeJob.before_photos || []).map((src, i) => <img key={i} src={src} className="proof-img" alt="Before" />)}</div>
              </div>
              <div className="dash-card">
                <h3>2. After-Wash Photos ({(activeJob.after_photos || []).length})</h3>
                <label className="upload-box">📷 Select After-Wash Images<input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, activeJob.id, 'after')} /></label>
                <div className="photo-thumbs">{(activeJob.after_photos || []).map((src, i) => <img key={i} src={src} className="proof-img" alt="After" />)}</div>
              </div>
            </div>
          </>
        )}

        {user.role === 'worker' && activeTab === 'completed' && (
          <div className="dash-card wide">
            <h3>Completed Jobs</h3>
            <div className="item-list">
              {allBookings.filter((b) => b.status === 'Completed').map((b) => (
                <div key={b.id} className="item-row">
                  <div><b>#{b.id} · {b.vehicle}</b><small style={{ display: 'block' }}>{b.customer_name} · {b.booking_date}</small></div>
                  <span className="status-badge status-completed">Completed</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.role === 'admin' && activeTab === 'overview' && (
          <>
            <div className="dash-head"><div><span className="eyebrow">ADMIN COMMAND CENTER</span><h2>Platform Overview.</h2></div></div>
            <div className="stats-grid-4">
              <div className="dash-card"><span className="eyebrow">TOTAL CUSTOMERS</span><h3>{adminData.customers.length}</h3><p>Active accounts</p></div>
              <div className="dash-card"><span className="eyebrow">TOTAL WORKERS</span><h3>{adminData.workers.length}</h3><p>Field crew</p></div>
              <div className="dash-card"><span className="eyebrow">ACTIVE SUBSCRIPTIONS</span><h3>{adminData.activeSubscriptions}</h3><p>PostgreSQL synced</p></div>
              <div className="dash-card"><span className="eyebrow">TOTAL REVENUE</span><h3>₹{adminData.payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString('en-IN')}</h3><p>Verified payments</p></div>
            </div>
          </>
        )}

        {user.role === 'admin' && activeTab === 'bookings' && (
          <div className="dash-card wide">
            <h3>All Bookings ({adminData.bookings.length})</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Customer</th><th>Vehicle &amp; Service</th><th>Assigned Worker</th><th>Status</th></tr></thead>
                <tbody>
                  {adminData.bookings.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td><td><b>{b.customer_name}</b><br /><small>{b.customer_phone}</small></td><td>{b.vehicle}<br /><small>{b.service}</small></td>
                      <td>
                        <select value={b.worker_name} onChange={(e) => handleAssignWorker(b.id, e.target.value)}>
                          {adminData.workers.map((w) => <option key={w.id} value={w.name}>{w.name} ({w.worker_code})</option>)}
                        </select>
                      </td>
                      <td><span className={`status-badge status-${b.status.toLowerCase().replace(/\s+/g, '-')}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {user.role === 'admin' && activeTab === 'workers' && (
          <div className="dash-grid">
            <div className="dash-card">
              <h3>Add New Worker</h3>
              <form className="clean-form" onSubmit={handleAddWorker}>
                <label>Full Name<input required value={wName} onChange={(e) => setWName(e.target.value)} /></label>
                <div className="form-row">
                  <label>Phone (Login ID)<input required maxLength={10} value={wPhone} onChange={(e) => setWPhone(e.target.value)} /></label>
                  <label>Backup Email<input type="email" required value={wEmail} onChange={(e) => setWEmail(e.target.value)} /></label>
                </div>
                <label>Service Zone<input required value={wZone} onChange={(e) => setWZone(e.target.value)} /></label>
                <button className="btn primary" type="submit">+ Add Worker</button>
              </form>
            </div>
            <div className="dash-card">
              <h3>Worker Roster</h3>
              <div className="item-list">
                {adminData.workers.map((w) => (
                  <div key={w.id} className="item-row">
                    <div><b>{w.name}</b> <span className="pill-mini">{w.worker_code}</span><small style={{ display: 'block' }}>Phone: {w.phone} · Zone: {w.zone}</small></div>
                    <span className="status-badge status-active">{w.completed_jobs} Jobs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {user.role === 'admin' && activeTab === 'customers' && (
          <div className="dash-card wide">
            <h3>Registered Customers ({adminData.customers.length})</h3>
            <div className="item-list">
              {adminData.customers.map((c) => (
                <div key={c.id} className="item-row">
                  <div><b>{c.name}</b><small style={{ display: 'block' }}>Phone: {c.phone} · Backup Email: {c.email}</small></div>
                  <span className="status-badge status-active">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.role === 'admin' && activeTab === 'plans' && (
          <div className="plans">
            {adminData.plans.map((p) => (
              <div key={p.id} className="plan">
                <span className="plan-tag">{p.id.toUpperCase()}</span>
                <h3>{p.name}</h3>
                <div className="price">₹{Number(p.price).toLocaleString('en-IN')}<small> / month</small></div>
                <form className="clean-form" style={{ marginTop: 14 }} onSubmit={(e) => handleUpdatePlanPrice(e, p.id, e.target.price.value)}>
                  <label>Update Price (INR)<input name="price" type="number" defaultValue={p.price} required /></label>
                  <button type="submit" className="btn primary small full">Update Price</button>
                </form>
              </div>
            ))}
          </div>
        )}

        {user.role === 'admin' && activeTab === 'revenue' && (
          <div className="dash-card wide">
            <h3>Customer Payment Ledger</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Txn ID</th><th>Customer</th><th>Plan</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {adminData.payments.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.id}</b></td><td>{p.customer_name}<br /><small>{p.customer_phone}</small></td><td>{p.plan_name} Plan</td><td>{p.method}</td>
                      <td><b>₹{Number(p.amount).toLocaleString('en-IN')}</b></td><td><span className="status-badge status-completed">{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <PaymentModal plan={checkoutPlan} user={user} onClose={() => setCheckoutPlan(null)} onCompleted={loadData} onToast={onToast} />
    </div>
  );
}
