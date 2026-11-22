import React, { useState } from 'react';

export default function LandingPage({ plans, user, onOpenAuth, onReturnDashboard }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      <div className="topline">
        <span>&#9679; Doorstep car care, right where you are</span>
        <span>Mon – Sun · 7:00 AM – 8:00 PM</span>
      </div>

      <header className="nav">
        <a className="brand" href="#">
          <span className="brand-mark">
            <svg className="ico ico-lg" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </span>
          <span>rinse<span className="brand-accent">go</span><small>DOORSTEP CAR CARE</small></span>
        </a>
        <nav className={menuOpen ? 'mobile-open' : ''}>
          <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>Memberships</a>
          <a href="#portals" onClick={() => setMenuOpen(false)}>Role Portals</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onOpenAuth('login', 'customer'); }}>Member Login</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <button className="btn primary" onClick={onReturnDashboard}>Open {user.role.toUpperCase()} Dashboard →</button>
          ) : (
            <>
              <button className="btn outline" onClick={() => onOpenAuth('login', 'customer')}>Login</button>
              <button className="btn primary" onClick={() => onOpenAuth('signup', 'customer')}>Sign Up →</button>
            </>
          )}
          <button type="button" className="burger-btn" aria-label="Toggle Menu" onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="pill"><span className="pulse"></span> YOUR CAR. YOUR DRIVEWAY. OUR CARE.</div>
            <h1>A spotless car.<br /><em>Without the</em> detour.</h1>
            <p className="hero-sub">Professional car cleaning that comes to your doorstep. Pick a plan, book a slot, and let our trained crew do the rest.</p>
            <div className="hero-ctas">
              <button className="btn primary large" onClick={() => onOpenAuth('signup', 'customer')}>Sign Up &amp; Book Wash →</button>
              <button className="btn outline large" onClick={() => onOpenAuth('login', 'customer')}>Existing Member Login</button>
            </div>
            <div className="hero-proof">
              <div className="avatars"><span>R</span><span>A</span><span>K</span><span>+</span></div>
              <div>
                <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <small style={{ color: '#778695', fontSize: 10 }}>Doorstep convenience, made reliable</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image"></div>
            <div className="floating-card float-one">
              <span className="float-icon">&#10003;</span>
              <div><b>Care you can trust</b><small>Trained cleaning crew</small></div>
            </div>
            <div className="floating-card float-two">
              <span className="float-icon mint">&#128247;</span>
              <div><b>Before &amp; after proof</b><small>Every completed service</small></div>
            </div>
            <div className="image-caption">
              <span>01 / DOORSTEP DETAILING</span>
              <b>Fresh finish. Zero hassle.</b>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div><span>&#128167;</span><span><b>Water-conscious</b><small>Smarter cleaning methods</small></span></div>
          <div><span>&#9200;</span><span><b>On your schedule</b><small>Convenient time slots</small></span></div>
          <div><span>&#128737;</span><span><b>Trained professionals</b><small>Care at every step</small></span></div>
          <div><span>&#128247;</span><span><b>Photo verified</b><small>Before &amp; after updates</small></span></div>
        </section>

        <section className="section" id="how">
          <div className="section-heading">
            <span className="eyebrow">SIMPLE FROM START TO SHINE</span>
            <h2>Car care, in <em>three easy steps.</em></h2>
            <p>We bring the cleaning station to you. All you need to do is book.</p>
          </div>
          <div className="steps">
            <article><span className="step-no">01</span><div className="step-icon">&#128197;</div><h3>Choose your plan</h3><p>Select Basic, Standard or Premium and tell us where your car is parked.</p></article>
            <article><span className="step-no">02</span><div className="step-icon">&#128663;</div><h3>We come to you</h3><p>Your assigned cleaning professional arrives at your selected date and time.</p></article>
            <article><span className="step-no">03</span><div className="step-icon">&#10024;</div><h3>Enjoy the shine</h3><p>We clean your car and share before-and-after photos for your peace of mind.</p></article>
          </div>
        </section>

        <section className="section plans-section" id="plans">
          <div className="section-heading">
            <span className="eyebrow">MEMBERSHIPS THAT FIT YOUR DRIVE</span>
            <h2>Make clean a <em>regular thing.</em></h2>
            <p>Choose how often you want us to visit. Configurable by Admin.</p>
          </div>
          <div className="plans">
            {plans.map((p) => (
              <article key={p.id} className={`plan ${p.popular ? 'popular' : ''}`}>
                {p.popular && <div className="popular-tag">MOST POPULAR</div>}
                <div className="plan-icon">&#128167;</div>
                <span className="plan-tag">{p.tag}</span>
                <h3>{p.name}</h3>
                <div className="price">₹{Number(p.price).toLocaleString('en-IN')}<small> / month</small></div>
                <div className="plan-divider"></div>
                <ul>{(p.features || []).map((f, idx) => <li key={idx}>&#10003; {f}</li>)}</ul>
                <button className={`btn ${p.popular ? 'primary' : 'outline'} full`} onClick={() => onOpenAuth('signup', 'customer')}>
                  Choose {p.name} →
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="portals">
          <div className="section-heading">
            <span className="eyebrow">ONE PLACE FOR EVERY ROLE</span>
            <h2>Your service, <em>your dashboard.</em></h2>
            <p>Log in with your 10-digit phone number (or Sign Up if you are new) to open your role workspace.</p>
          </div>
          <div className="role-cards">
            <button onClick={() => onOpenAuth('login', 'customer')}>
              <span style={{ color: '#0e9d7e', fontSize: 20 }}>&#128100;</span>
              <b>Customer Login / Sign Up</b>
              <span>Manage subscription, vehicles, bookings &amp; service photos (Demo: 9000000001)</span>
              <span style={{ color: '#0e9d7e', fontWeight: 700, fontSize: 12 }}>Open Customer Portal →</span>
            </button>
            <button onClick={() => onOpenAuth('login', 'worker')}>
              <span style={{ color: '#0e9d7e', fontSize: 20 }}>&#128295;</span>
              <b>Worker Login</b>
              <span>View assigned jobs &amp; upload before/after photos (Demo: 9000000002)</span>
              <span style={{ color: '#0e9d7e', fontWeight: 700, fontSize: 12 }}>Open Worker Portal →</span>
            </button>
            <button onClick={() => onOpenAuth('login', 'admin')}>
              <span style={{ color: '#0e9d7e', fontSize: 20 }}>&#128202;</span>
              <b>Admin Login</b>
              <span>Manage customers, workers, bookings, plans &amp; revenue (Demo: 9000000003)</span>
              <span style={{ color: '#0e9d7e', fontWeight: 700, fontSize: 12 }}>Open Admin Console →</span>
            </button>
          </div>
        </section>

        <section className="bottom-cta">
          <div>
            <span className="eyebrow">YOUR DRIVE DESERVES THIS</span>
            <h2>Ready for that <em>just-cleaned feeling?</em></h2>
            <p>Create your account with your phone number and book your doorstep wash today.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn light large" onClick={() => onOpenAuth('signup', 'customer')}>Sign Up Now →</button>
            <button className="btn outline large" style={{ background: 'transparent', color: 'white', borderColor: '#72cbb3' }} onClick={() => onOpenAuth('login', 'customer')}>Login</button>
          </div>
        </section>
      </main>

      <footer>
        <span><strong>rinse<span className="brand-accent">go</span></strong> — Doorstep Car Care Subscription Platform</span>
        <span>&copy; 2026 RinseGo. React + Node.js + PostgreSQL + Nginx Reverse Proxy.</span>
      </footer>
    </div>
  );
}
