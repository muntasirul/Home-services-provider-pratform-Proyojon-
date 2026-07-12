"use strict";

// ─── DATABASE ──────────────────────────────────────────────────────────────────

const DB = {
  _key: (k) => `proyojon_${k}`,

  get(key) {
    try { return JSON.parse(localStorage.getItem(this._key(key))); }
    catch { return null; }
  },

  set(key, value) {
    localStorage.setItem(this._key(key), JSON.stringify(value));
    return value;
  },

  remove(key) {
    localStorage.removeItem(this._key(key));
  },

  getSession()         { return this.get('session'); },
  setSession(user)     { return this.set('session', user); },
  clearSession()       { this.remove('session'); },

  // Persist last active page (not auth)
  getLastPage()        { return this.get('lastPage') || 'landing'; },
  setLastPage(page)    { return this.set('lastPage', page); },

  // Memory Cache for MongoDB Collections
  getUsers()           { return _state.users || []; },
  getWorkers()         { return _state.workers || []; },
  getBookings()        { return _state.bookings || []; },
  getAreas()           { return _state.areas || []; },
  getServices()        { return _state.services || []; },

  async sync() {
    try {
      const [areasRes, workersRes, bookingsRes, servicesRes] = await Promise.all([
        fetch('/api/areas'),
        fetch('/api/workers'),
        fetch('/api/bookings'),
        fetch('/api/services')
      ]);
      _state.areas = await areasRes.json();
      _state.workers = await workersRes.json();
      _state.bookings = await bookingsRes.json();
      _state.services = await servicesRes.json();
      _state.users = [..._state.workers];
    } catch (err) {
      console.error('Failed to sync database collections:', err);
    }
  }
};

const CATEGORIES = [
  { id:'all',       name:'All Categories',  icon:'🏠' },
  { id:'ac',        name:'AC Services',     icon:'❄️' },
  { id:'clean',     name:'Cleaning',        icon:'🧹' },
  { id:'plumb',     name:'Plumbing',        icon:'🔧' },
  { id:'elect',     name:'Electrical',      icon:'⚡' },
  { id:'paint',     name:'Painting',        icon:'🎨' },
  { id:'pest',      name:'Pest Control',    icon:'🐛' },
  { id:'water',     name:'Water Services',  icon:'💧' },
  { id:'appliance', name:'Appliance Repair',icon:'🛠️' },
  { id:'carpentry', name:'Carpentry',       icon:'🪚' },
  { id:'laundry',   name:'Laundry',         icon:'👕' },
  { id:'moving',    name:'Moving',          icon:'🚚' },
  { id:'security',  name:'Security',        icon:'🔒' },
  { id:'it',        name:'IT Services',     icon:'💻' },
];

const COLORS = ['bg-red-500','bg-teal-500','bg-yellow-500','bg-indigo-500','bg-purple-500','bg-pink-500','bg-green-600','bg-blue-600'];

const REVIEWS = {
  customers: [
    { name:'Adnan Chowdhury', role:'Gulshan Resident', text:"Proyojon didn't just fix my AC; they restored my faith in local services. Punctual and professional." },
    { name:'Dr. Nusrat Jahan', role:'Medical Professional', text:"I've used them for deep cleaning twice. The attention to detail is unmatched in Dhaka." },
    { name:'Ziaul Huq', role:'Entrepreneur', text:"The transparent pricing is a game changer. No more haggling with workers." },
  ],
  artisans: [
    { name:'Master Kabir', role:'Senior Plumber', text:"I have been a plumber for 18 years. Proyojon is the only platform that treats my skill with dignity." },
    { name:'Niloy Das', role:'Electrician', text:"The training sessions at Proyojon helped me learn modern safety standards I never knew before." },
    { name:'Sumi Akter', role:'Cleaning Expert', text:"I can now support my family with a consistent income. Proyojon is my second home." },
  ],
};

const TIMELINE = [
  { year:'2022', title:'The Seed',         desc:'Started in a small garage in Dhanmondi with just 5 specialized artisans who believed every home deserves mastery.',     num:'01' },
  { year:'2023', title:'The Digital Leap', desc:'Launched our first platform. We scaled from 5 to 200 artisans, providing consistent work and fair wages across the city.', num:'02' },
  { year:'2024', title:'The Standard',     desc:'Established the Proyojon Academy — a mandatory certification for all our providers to ensure quality in every service.',   num:'03' },
  { year:'2025', title:"Dhaka's Pulse",    desc:"Became the highest-rated service collective in the country. Helping 10,000+ homes monthly while maintaining 100% safety records.", num:'04' },
];

// ─── STATE ─────────────────────────────────────────────────────────────────────

let _state = {
  currentPage: 'auth',
  authMode: 'login',
  authRole: 'customer',
  catFilter: 'all',
  searchQuery: '',
  zone: 'All',
  workerSkillFilter: 'All',
  cartItems: [],
  users: [],
  workers: [],
  bookings: [],
  areas: [],
  services: []
};

// ─── UTILITY ───────────────────────────────────────────────────────────────────

function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show';
  t.style.background = type === 'error' ? '#dc2626' : '#0d0e11';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-BD', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function initials(name) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ─── REVEAL OBSERVER ───────────────────────────────────────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.1 });

function attachReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ─── APP ───────────────────────────────────────────────────────────────────────

const App = {
  // Switch between app pages (not auth)
  async goPage(pageId) {
    await DB.sync(); // Refresh collections from server before rendering any page

    // Hide all app pages
    document.querySelectorAll('#app-wrapper .page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    const nav = document.getElementById(`bnav-${pageId}`);
    if (nav) nav.classList.add('active');

    _state.currentPage = pageId;
    // Persist the page so reload returns here
    DB.setLastPage(pageId);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific setup
    if (pageId === 'home')       { Services.render(); }
    if (pageId === 'workers')    { Workers.render(); }
    if (pageId === 'story')      { Story.render(); }
    if (pageId === 'bookings')   { Bookings.render(); }
    if (pageId === 'profile')    { Profile.load(); }
    if (pageId === 'mod')        { Mod.load(); }
    if (pageId === 'provider')   { Provider.load(); }
    if (pageId === 'landing')    { Landing.render(); }

    setTimeout(attachReveal, 100);
  },

  // Show the auth screen (hide app)
  showAuth() {
    document.getElementById('page-auth').style.display = 'flex';
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'none';
    _state.currentPage = 'auth';
    setTimeout(attachReveal, 100);
  },

  // Show the app (hide auth)
  showApp(session) {
    document.getElementById('page-auth').style.display = 'none';
    document.getElementById('main-nav').style.display = 'block';
    document.getElementById('app-wrapper').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'flex';

    if (session.role === 'moderator') {
      document.getElementById('bnav-mod').classList.remove('hidden');
      document.getElementById('bnav-provider').classList.add('hidden');
    } else if (session.role === 'provider') {
      document.getElementById('bnav-provider').classList.remove('hidden');
      document.getElementById('bnav-mod').classList.add('hidden');
    } else {
      document.getElementById('bnav-mod').classList.add('hidden');
      document.getElementById('bnav-provider').classList.add('hidden');
    }
  },

  async init() {
    await DB.sync(); // Initial server fetch
    const session = DB.getSession();
    if (session) {
      // Already logged in — restore the last page
      App.showApp(session);
      const lastPage = DB.getLastPage();
      
      // Guard for pages
      if (lastPage === 'mod' && session.role !== 'moderator') {
        App.goPage('landing');
      } else if (lastPage === 'provider' && session.role !== 'provider') {
        App.goPage('landing');
      } else {
        App.goPage(lastPage);
      }
    } else {
      App.showAuth();
    }
  },
};

// ─── AUTH ──────────────────────────────────────────────────────────────────────

const Auth = {
  setRole(role) {
    _state.authRole = role;
    document.getElementById('role-customer').classList.toggle('active', role === 'customer');
    document.getElementById('role-provider').classList.toggle('active', role === 'provider');
    document.getElementById('role-moderator').classList.toggle('active', role === 'moderator');
    Auth.updateFormFields();
  },

  toggleMode() {
    _state.authMode = _state.authMode === 'login' ? 'signup' : 'login';
    const isLogin = _state.authMode === 'login';
    document.getElementById('field-name').classList.toggle('hidden', isLogin);
    document.getElementById('field-confirm').classList.toggle('hidden', isLogin);
    document.getElementById('auth-title').textContent = isLogin ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-subtitle').textContent = isLogin ? "Login to access Dhaka's finest services." : "Join thousands of happy customers.";
    document.getElementById('auth-btn').textContent = isLogin ? 'Enter Proyojon' : 'Create Account';
    document.getElementById('toggle-mode-btn').textContent = isLogin ? 'Create an account' : 'Already have an account?';
    document.getElementById('auth-error').classList.add('hidden');
    Auth.updateFormFields();
  },

  updateFormFields() {
    const isSignup = _state.authMode === 'signup';
    const role = _state.authRole;

    const modZone = document.getElementById('field-mod-zone');
    const provSkill = document.getElementById('field-provider-skill');
    const provZones = document.getElementById('field-provider-zones');
    const provDoc = document.getElementById('field-provider-doc');

    modZone.classList.add('hidden');
    provSkill.classList.add('hidden');
    provZones.classList.add('hidden');
    provDoc.classList.add('hidden');

    if (isSignup) {
      if (role === 'moderator') {
        modZone.classList.remove('hidden');
      } else if (role === 'provider') {
        provSkill.classList.remove('hidden');
        provZones.classList.remove('hidden');
        provDoc.classList.remove('hidden');
      }
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('auth-error');
    errEl.classList.add('hidden');

    const email    = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;

    if (_state.authMode === 'signup') {
      const name    = document.getElementById('auth-name').value.trim();
      const confirm = document.getElementById('auth-confirm').value;

      if (!name) { Auth.showError('Name is required'); return; }
      if (password.length < 6) { Auth.showError('Password must be at least 6 characters'); return; }
      if (password !== confirm) { Auth.showError('Passwords do not match'); return; }

      const body = {
        name,
        email,
        password,
        role: _state.authRole
      };

      if (_state.authRole === 'customer') {
        body.phone = '';
        body.zone = 'Gulshan';
      } else if (_state.authRole === 'moderator') {
        body.assignedZone = document.getElementById('auth-mod-zone').value;
      } else if (_state.authRole === 'provider') {
        const skill = document.getElementById('auth-provider-skill').value;
        const selectedZones = Array.from(document.getElementById('auth-provider-zones').selectedOptions).map(opt => opt.value);
        const doc = document.getElementById('auth-provider-doc').value.trim() || 'nid_doc.pdf';

        body.phone = '';
        body.serviceCategory = skill;
        body.coverageZones = selectedZones;
        body.verificationDocument = doc;
        body.color = randomColor();
        body.initials = initials(name);
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { Auth.showError(data.error || 'Registration failed'); return; }

        data.id = data._id; // legacy compatibility
        DB.setSession(data);
        await DB.sync();

        showToast(`Welcome to Proyojon, ${name}!`);
        setTimeout(() => {
          App.showApp(data);
          if (data.role === 'provider') {
            App.goPage('provider');
          } else if (data.role === 'moderator') {
            App.goPage('mod');
          } else {
            App.goPage('landing');
          }
        }, 600);
      } catch (err) {
        Auth.showError('Network error. Please try again.');
      }

    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: _state.authRole })
        });
        const data = await res.json();
        if (!res.ok) { Auth.showError(data.error || 'Login failed'); return; }

        data.id = data._id; // legacy compatibility
        DB.setSession(data);
        await DB.sync();

        showToast(`Welcome back, ${data.name}!`);
        setTimeout(() => {
          App.showApp(data);
          if (data.role === 'provider') {
            App.goPage('provider');
          } else if (data.role === 'moderator') {
            App.goPage('mod');
          } else {
            App.goPage('landing');
          }
        }, 600);
      } catch (err) {
        Auth.showError('Network error. Please try again.');
      }
    }
  },

  showError(msg) {
    const errEl = document.getElementById('auth-error');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  },

  logout() {
    DB.clearSession();
    DB.setLastPage('landing');
    _state.cartItems = [];
    Cart.updateUI();

    // Reset profile UI
    document.getElementById('profile-name').textContent = 'Guest User';
    document.getElementById('profile-initial').textContent = '?';
    document.getElementById('profile-role-display').textContent = 'Member';
    showToast('Logged out successfully');
    setTimeout(() => {
      // Hide all app pages
      document.querySelectorAll('#app-wrapper .page').forEach(p => p.classList.remove('active'));
      App.showAuth();
    }, 600);
  },
};

// ─── BOOKING CONFIRMED ─────────────────────────────────────────────────────────

const BookingConfirmed = {
  show(bookingId) {
    document.getElementById('confirm-booking-id').textContent = `Booking ID: ${bookingId}`;
    document.getElementById('booking-confirmed-overlay').classList.add('open');
  },

  hide() {
    document.getElementById('booking-confirmed-overlay').classList.remove('open');
  },

  viewOrders() {
    this.hide();
    App.goPage('bookings');
  },

  bookMore() {
    this.hide();
    App.goPage('home');
  },
};

// ─── CART ──────────────────────────────────────────────────────────────────────

const Cart = {
  toggle() {
    const panel = document.getElementById('cart-panel');
    panel.classList.toggle('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('cart-panel')) this.toggle();
  },

  add(id) {
    const svc = DB.getServices().find(s => s.id === id);
    if (!svc) return;
    _state.cartItems.push({ ...svc });
    this.updateUI();
    showToast(`${svc.name} added to cart`);
  },

  remove(idx) {
    _state.cartItems.splice(idx, 1);
    this.updateUI();
  },

  updateUI() {
    const items  = _state.cartItems;
    const badge  = document.getElementById('cart-badge');
    const total  = items.reduce((s, i) => s + i.price, 0);

    badge.textContent = items.length;
    badge.style.display = items.length ? 'flex' : 'none';

    document.getElementById('cart-total').textContent = `৳${total.toLocaleString()}`;

    document.getElementById('cart-items').innerHTML = items.length
      ? items.map((item, idx) => `
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p class="font-medium text-sm">${item.icon} ${item.name}</p>
              <p class="text-xs text-gray-400 mt-0.5">৳${item.price.toLocaleString()}</p>
            </div>
            <button onclick="Cart.remove(${idx})" class="text-red-400 hover:text-red-600 font-bold text-lg leading-none transition">✕</button>
          </div>
        `).join('')
      : '<p class="text-gray-400 text-sm text-center py-10 font-syne uppercase tracking-widest">Your cart is empty</p>';
  },

  async checkout() {
    if (!_state.cartItems.length) { showToast('Your cart is empty', 'error'); return; }
    const session = DB.getSession();
    if (!session) { showToast('Please login first', 'error'); return; }

    if (!confirm('Are you sure you want to confirm this order?')) return;

    const booking = {
      id:         generateId('BK'),
      userId:     session.id || session._id,
      userName:   session.name,
      items:      [..._state.cartItems],
      total:      _state.cartItems.reduce((s, i) => s + i.price, 0)
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to confirm order', 'error'); return; }

      await DB.sync(); // Fetch latest from server

      _state.cartItems = [];
      this.updateUI();
      this.toggle(); // Close the cart drawer first

      Profile.refreshStats();

      // Show the booking confirmed overlay (not a page navigation)
      setTimeout(() => BookingConfirmed.show(booking.id), 200);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  },
};

// ─── SERVICES ──────────────────────────────────────────────────────────────────

const Services = {
  render() {
    this.renderCategories();
    this.renderList();
  },

  renderCategories() {
    document.getElementById('cat-grid').innerHTML = CATEGORIES.map(c => `
      <div class="cat-card ${_state.catFilter === c.id ? 'active' : ''}" onclick="Services.setCat('${c.id}')">
        <span class="text-2xl">${c.icon}</span>
        <span class="text-xs font-bold uppercase tracking-wider">${c.name}</span>
      </div>
    `).join('');
  },

  renderList() {
    const q = _state.searchQuery.toLowerCase();
    const filtered = DB.getServices().filter(s =>
      (_state.catFilter === 'all' || s.cat === _state.catFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    );

    const listEl = document.getElementById('svc-list');
    const noEl   = document.getElementById('no-results');

    if (!filtered.length) {
      listEl.innerHTML = '';
      noEl.classList.remove('hidden');
      return;
    }
    noEl.classList.add('hidden');

    listEl.innerHTML = filtered.map(s => `
      <div class="svc-card reveal">
        <div class="flex justify-between mb-4">
          <span class="text-4xl">${s.icon}</span>
          <span class="text-orange-600 font-bold text-sm">★ ${s.rating}</span>
        </div>
        <h4 class="font-syne font-bold text-base uppercase mb-1">${s.name}</h4>
        <p class="text-gray-400 text-xs mb-5 leading-relaxed">${s.desc}</p>
        <div class="flex justify-between items-center">
          <span class="font-syne text-2xl font-bold">৳${s.price.toLocaleString()}</span>
          <button class="add-btn" onclick="Cart.add(${s.id})">Add</button>
        </div>
      </div>
    `).join('');

    setTimeout(attachReveal, 80);
  },

  setCat(id) {
    _state.catFilter = id;
    _state.searchQuery = '';
    document.getElementById('search-input').value = '';
    this.renderCategories();
    this.renderList();
  },

  search(q) {
    _state.searchQuery = q;
    this.renderList();
  },

  setZone(el, zone) {
    _state.zone = zone;
    document.querySelectorAll('.zone-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  },
};

// ─── LANDING ───────────────────────────────────────────────────────────────────

const Landing = {
  render() {
    const featured = DB.getServices().slice(0, 6);
    document.getElementById('featured-services').innerHTML = featured.map(s => `
      <div class="svc-card reveal">
        <div class="flex justify-between mb-4">
          <span class="text-4xl">${s.icon}</span>
          <span class="text-orange-600 font-bold text-sm">★ ${s.rating}</span>
        </div>
        <h4 class="font-syne font-bold text-base uppercase mb-1">${s.name}</h4>
        <p class="text-gray-400 text-xs mb-5 leading-relaxed">${s.desc}</p>
        <div class="flex justify-between items-center">
          <span class="font-syne text-2xl font-bold">৳${s.price.toLocaleString()}</span>
          <button class="add-btn" onclick="Cart.add(${s.id})">Add</button>
        </div>
      </div>
    `).join('');
    setTimeout(attachReveal, 80);
  },
};

// ─── WORKERS ───────────────────────────────────────────────────────────────────

const Workers = {
  render() {
    const verifiedWorkers = DB.getWorkers().filter(w => w.verifiedStatus === 'Verified');
    const skills  = ['All', ...new Set(verifiedWorkers.map(w => w.serviceCategory || w.skill))];

    document.getElementById('skill-filter').innerHTML = skills.map(s => `
      <button class="zone-pill ${_state.workerSkillFilter === s ? 'active' : ''}" onclick="Workers.filter(this,'${s}')">${s}</button>
    `).join('');

    this.renderList(verifiedWorkers);
  },

  renderList(workers) {
    const filtered = workers.filter(w =>
      _state.workerSkillFilter === 'All' || (w.serviceCategory || w.skill) === _state.workerSkillFilter
    );

    document.getElementById('all-workers-list').innerHTML = filtered.map((w, i) => `
      <div class="worker-card reveal" style="animation-delay:${i * 0.07}s">
        <div class="worker-avatar ${w.color || 'bg-[#0d0e11]'}">${w.initials}</div>
        <div>
          <h4 class="font-syne font-bold text-lg">${w.name}</h4>
          <p class="text-orange-600 text-xs font-bold uppercase tracking-widest mt-1">${w.serviceCategory || w.skill}</p>
          <p class="text-gray-400 text-xs mt-2">📍 ${(w.coverageZones || [w.zone || w.area]).join(', ')}</p>
        </div>
        <span class="status-badge ${w.status === 'active' ? 'badge-active' : 'badge-pending'}">${w.status}</span>
      </div>
    `).join('');

    setTimeout(attachReveal, 80);
  },

  filter(el, skill) {
    _state.workerSkillFilter = skill;
    document.querySelectorAll('#skill-filter .zone-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    
    const verifiedWorkers = DB.getWorkers().filter(w => w.verifiedStatus === 'Verified');
    this.renderList(verifiedWorkers);
  },
};

// ─── STORY ─────────────────────────────────────────────────────────────────────

const Story = {
  render() {
    document.getElementById('timeline-items').innerHTML = TIMELINE.map((t, i) => `
      <div class="relative flex gap-8 mb-16 reveal">
        <div class="flex flex-col items-center">
          <div class="timeline-dot">${t.num}</div>
          ${i < TIMELINE.length - 1 ? '<div class="flex-1 w-0.5 bg-gray-200 mt-2"></div>' : ''}
        </div>
        <div class="pb-4">
          <h3 class="font-syne text-3xl font-bold text-orange-600">${t.year}</h3>
          <h4 class="font-syne text-xl font-bold uppercase mt-1">${t.title}</h4>
          <p class="text-gray-500 mt-3 leading-relaxed">${t.desc}</p>
        </div>
      </div>
    `).join('');

    document.getElementById('customer-reviews').innerHTML = REVIEWS.customers.map(r => `
      <div class="review-card reveal">
        <p class="font-corm italic text-xl mb-4">"${r.text}"</p>
        <div>
          <p class="font-syne font-bold text-xs uppercase tracking-widest">— ${r.name}</p>
          <p class="text-gray-400 text-xs mt-1">${r.role}</p>
        </div>
      </div>
    `).join('');

    document.getElementById('provider-reviews').innerHTML = REVIEWS.artisans.map(r => `
      <div class="review-card dark reveal">
        <p class="font-corm italic text-xl mb-4">"${r.text}"</p>
        <div>
          <p class="font-syne font-bold text-xs uppercase tracking-widest text-orange-400">— ${r.name}</p>
          <p class="text-gray-500 text-xs mt-1">${r.role}</p>
        </div>
      </div>
    `).join('');

    setTimeout(attachReveal, 80);
  },
};

// ─── BOOKINGS ──────────────────────────────────────────────────────────────────

const Bookings = {
  _filter: 'all',

  render() {
    const session  = DB.getSession();
    if (!session) return;

    const all = DB.getBookings().filter(b => b.userId === session.id).reverse();
    this.renderList(all);
  },

  renderList(bookings) {
    const filtered = this._filter === 'all' ? bookings : bookings.filter(b => b.status === this._filter);
    const el = document.getElementById('bookings-list');

    ['all','pending','done'].forEach(f => {
      document.getElementById(`btab-${f}`)?.classList.toggle('active', this._filter === f);
    });

    if (!filtered.length) {
      el.innerHTML = `<div class="text-center py-20 bg-white rounded-3xl border">
        <p class="font-syne uppercase tracking-widest text-gray-400 text-sm">No bookings found</p>
      </div>`;
      return;
    }

    el.innerHTML = filtered.map(b => `
      <div class="booking-row">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-syne font-bold uppercase tracking-wider text-sm">${b.id}</p>
            <p class="text-xs text-gray-400 mt-1">${formatDate(b.createdAt)}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-orange-600">৳${b.total.toLocaleString()}</span>
            <span class="status-badge ${b.status === 'done' ? 'badge-done' : 'badge-pending'}">${b.status}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${b.items.map(i => `<span class="text-xs bg-gray-100 px-3 py-1 rounded-full">${i.icon} ${i.name}</span>`).join('')}
        </div>
        ${b.status === 'pending' ? `<button onclick="Bookings.cancel('${b.id}')" class="mt-3 text-xs text-red-400 hover:text-red-600 font-bold uppercase tracking-widest transition">Cancel Order</button>` : ''}
      </div>
    `).join('');
  },

  filter(f) {
    this._filter = f;
    this.render();
  },

  cancel(id) {
    const bookings = DB.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      bookings[idx].status = 'cancelled';
      DB.saveBookings(bookings);
      showToast('Booking cancelled');
      this.render();
      Profile.refreshStats();
    }
  },
};

// ─── PROFILE ───────────────────────────────────────────────────────────────────

const Profile = {
  load() {
    const user = DB.getSession();
    if (!user) return;

    document.getElementById('profile-name').textContent          = user.name;
    document.getElementById('profile-initial').textContent       = initials(user.name);
    document.getElementById('profile-role-display').textContent  = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('profile-email-display').textContent = user.email;

    document.getElementById('profile-edit-name').value  = user.name;
    document.getElementById('profile-edit-phone').value = user.phone || '';
    document.getElementById('profile-edit-zone').value  = user.zone  || 'Gulshan';

    this.refreshStats();
  },

  refreshStats() {
    const user     = DB.getSession();
    if (!user) return;
    const bookings = DB.getBookings().filter(b => b.userId === user.id && b.status !== 'cancelled');
    const spent    = bookings.reduce((s, b) => s + b.total, 0);

    document.getElementById('stat-bookings').textContent = bookings.length;
    document.getElementById('stat-spent').textContent    = `৳${spent.toLocaleString()}`;
  },

  async save(e) {
    e.preventDefault();
    const user  = DB.getSession();
    if (!user) return;

    const name  = document.getElementById('profile-edit-name').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    const zone  = document.getElementById('profile-edit-zone').value;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || user._id, name, phone, zone })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Profile update failed', 'error'); return; }

      data.id = data._id; // legacy compatibility
      DB.setSession(data);
      await DB.sync();

      document.getElementById('profile-name').textContent   = name;
      document.getElementById('profile-initial').textContent = initials(name);

      showToast('Profile updated successfully');
      this.load();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  },
};

// ─── MODERATOR ─────────────────────────────────────────────────────────────────

const Mod = {
  load() {
    const now = new Date();
    document.getElementById('mod-date').textContent = now.toLocaleDateString('en-BD', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

    const bookings = DB.getBookings();
    const users    = DB.getUsers();
    const workers  = DB.getWorkers();
    const revenue  = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.total, 0);

    document.getElementById('mod-stat-bookings').textContent = bookings.length;
    document.getElementById('mod-stat-revenue').textContent  = `৳${revenue.toLocaleString()}`;
    document.getElementById('mod-stat-users').textContent    = users.length;
    document.getElementById('mod-stat-workers').textContent  = workers.filter(w => w.status === 'active').length;

    this.renderBookings(bookings);
    this.renderWorkers(workers);
  },

  renderBookings(bookings) {
    const tbody = document.getElementById('mod-bookings-tbody');
    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-400 py-10 text-sm">No bookings yet</td></tr>`;
      return;
    }
    
    tbody.innerHTML = [...bookings].reverse().map(b => {
      // Find verified workers eligible to perform this job (skill category match or general)
      const workers = DB.getWorkers().filter(w => w.verifiedStatus === 'Verified');
      const options = workers.map(w => `<option value="${w._id || w.id}" ${b.providerId === (w._id || w.id) ? 'selected' : ''}>${w.name} (${w.serviceCategory || w.skill})</option>`).join('');

      const assignmentSelect = `
        <select onchange="Mod.assignWorker('${b.id}', this.value)" class="text-xs border rounded p-1 bg-white">
          <option value="">-- Assign Worker --</option>
          ${options}
        </select>
      `;

      return `
        <tr>
          <td class="font-mono text-xs">${b.id}</td>
          <td>${b.userName}</td>
          <td class="text-xs text-gray-500">${b.items.map(i => i.name).join(', ')}</td>
          <td class="font-bold">৳${b.total.toLocaleString()}</td>
          <td class="text-xs text-gray-400">${formatDate(b.createdAt)}</td>
          <td><span class="status-badge ${b.status === 'done' ? 'badge-done' : b.status === 'cancelled' ? 'badge-pending' : 'badge-active'}">${b.status}</span></td>
          <td>
            <div class="flex flex-col gap-1.5">
              ${assignmentSelect}
              ${b.status === 'pending' ? `<button onclick="Mod.markDone('${b.id}')" class="text-xs font-bold text-green-600 hover:underline text-left">Mark Done</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderWorkers(workers) {
    const tbody = document.getElementById('mod-workers-tbody');
    tbody.innerHTML = workers.map(w => {
      let verificationMarkup = '';
      if (w.verifiedStatus === 'Pending') {
        verificationMarkup = `
          <button onclick="Mod.verifyWorker('${w._id || w.id}', 'Verified')" class="text-xs font-bold text-green-600 hover:underline">Verify</button>
          <button onclick="Mod.verifyWorker('${w._id || w.id}', 'Rejected')" class="ml-2 text-xs font-bold text-red-500 hover:underline">Reject</button>
        `;
      } else {
        verificationMarkup = `<span class="status-badge ${w.verifiedStatus === 'Verified' ? 'badge-done' : 'badge-rejected'}">${w.verifiedStatus || 'Pending'}</span>`;
      }

      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 ${w.color || 'bg-[#0d0e11]'} rounded-full flex items-center justify-center text-white text-xs font-bold">${w.initials}</div>
              <div>
                <span class="font-medium block">${w.name}</span>
                <span class="text-[10px] text-gray-400 font-mono">${w.email}</span>
              </div>
            </div>
          </td>
          <td>${w.serviceCategory || w.skill}</td>
          <td class="text-gray-500 text-xs">${(w.coverageZones || [w.zone || 'Gulshan']).join(', ')}</td>
          <td><span class="status-badge ${w.status === 'active' ? 'badge-active' : 'badge-pending'}">${w.status}</span></td>
          <td>
            <div class="flex items-center gap-2">
              ${verificationMarkup}
              <button onclick="Mod.toggleWorkerStatus('${w._id || w.id}', '${w.status === 'active' ? 'inactive' : 'active'}')" class="ml-2 text-xs font-bold text-gray-500 hover:text-orange-600 transition">${w.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button onclick="Mod.removeWorker('${w._id || w.id}')" class="text-xs font-bold text-red-400 hover:text-red-600 transition">Remove</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async verifyWorker(id, status) {
    try {
      const res = await fetch(`/api/workers/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) { showToast('Verification update failed', 'error'); return; }
      
      await DB.sync();
      showToast(`Worker verification set to: ${status}`);
      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async assignWorker(bookingId, workerId) {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: workerId })
      });
      if (!res.ok) { showToast('Assignment failed', 'error'); return; }

      await DB.sync();
      showToast('Worker assigned to booking');
      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async markDone(id) {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      if (!res.ok) { showToast('Status update failed', 'error'); return; }

      await DB.sync();
      this.load();
      showToast('Booking marked as done');
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async toggleWorkerStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/workers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) { showToast('Status toggle failed', 'error'); return; }

      await DB.sync();
      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async removeWorker(id) {
    if (!confirm('Remove this worker?')) return;
    try {
      const res = await fetch(`/api/workers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) { showToast('Remove worker failed', 'error'); return; }

      await DB.sync();
      this.load();
      showToast('Worker removed');
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  openAddWorker() {
    document.getElementById('worker-modal').classList.remove('hidden');
  },

  closeWorkerModal() {
    document.getElementById('worker-modal').classList.add('hidden');
    document.getElementById('wm-name').value = '';
    document.getElementById('wm-skill').value = '';
  },

  async submitWorker(e) {
    e.preventDefault();
    const name  = document.getElementById('wm-name').value.trim();
    const skill = document.getElementById('wm-skill').value.trim();
    const area  = document.getElementById('wm-area').value;

    const body = {
      name,
      email:    `${name.toLowerCase().replace(/\s+/g, '')}@proyojon.com`,
      password: 'password',
      role:     'provider',
      phone:    '+880 1500 000 000',
      serviceCategory: skill,
      verificationDocument: 'nid_manual.pdf',
      coverageZones: [area],
      initials: initials(name),
      color:    randomColor()
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) { showToast('Add worker failed', 'error'); return; }

      const data = await res.json();
      await fetch(`/api/workers/${data._id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Verified' })
      });

      await DB.sync();
      this.closeWorkerModal();
      this.load();
      showToast(`${name} added as worker`);
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  exportCSV() {
    const bookings = DB.getBookings();
    if (!bookings.length) { showToast('No data to export', 'error'); return; }

    const rows = [
      ['Booking ID','Customer','Services','Total','Status','Date'],
      ...bookings.map(b => [b.id, b.userName, b.items.map(i => i.name).join(' | '), b.total, b.status, formatDate(b.createdAt)]),
    ];

    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `proyojon_bookings_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  },
};

// ─── SERVICE PROVIDER ──────────────────────────────────────────────────────────

const Provider = {
  load() {
    const user = DB.getSession();
    if (!user || user.role !== 'provider') return;

    document.getElementById('provider-name').textContent = user.name;
    document.getElementById('provider-avatar').textContent = initials(user.name);
    document.getElementById('provider-skill-display').textContent = user.serviceCategory || user.skill;
    document.getElementById('provider-zones-display').textContent = (user.coverageZones || [user.zone || 'Gulshan']).join(', ');
    document.getElementById('provider-completed-count').textContent = user.completedCount || 0;
    document.getElementById('provider-rating-display').textContent = user.avgRating || 4.5;

    const badge = document.getElementById('provider-status-badge');
    badge.textContent = user.verifiedStatus || 'Pending';
    badge.className = 'status-badge';
    if (user.verifiedStatus === 'Verified') {
      badge.classList.add('badge-done');
    } else if (user.verifiedStatus === 'Rejected') {
      badge.classList.add('badge-rejected');
    } else {
      badge.classList.add('badge-pending');
    }

    this.renderJobs();
  },

  renderJobs() {
    const user = DB.getSession();
    const bookings = DB.getBookings();
    
    // Filter bookings assigned to this worker
    const assignedJobs = bookings.filter(b => b.providerId === user.id || b.providerId === user._id);
    const tbody = document.getElementById('provider-jobs-tbody');

    if (!assignedJobs.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-400 py-10 text-sm">No jobs assigned yet</td></tr>`;
      return;
    }

    tbody.innerHTML = [...assignedJobs].reverse().map(b => `
      <tr>
        <td class="font-mono text-xs">${b.id}</td>
        <td>${b.userName}</td>
        <td class="text-xs text-gray-500">${b.items.map(i => i.name).join(', ')}</td>
        <td class="font-bold">৳${b.total.toLocaleString()}</td>
        <td class="text-xs text-gray-400">${formatDate(b.createdAt)}</td>
        <td><span class="status-badge ${b.status === 'done' ? 'badge-done' : b.status === 'cancelled' ? 'badge-pending' : 'badge-active'}">${b.status}</span></td>
        <td>
          ${b.status !== 'done' && b.status !== 'cancelled' ? `<button onclick="Provider.completeJob('${b.id}')" class="text-xs font-bold text-green-600 hover:underline">Complete Job</button>` : '—'}
        </td>
      </tr>
    `).join('');
  },

  async completeJob(id) {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to complete job', 'error'); return; }

      await DB.sync(); // Refresh collections

      // Also refresh the session details since worker completedCount changed
      const session = DB.getSession();
      const updatedUser = DB.getWorkers().find(w => w._id === session._id || w.id === session.id);
      if (updatedUser) {
        updatedUser.id = updatedUser._id;
        DB.setSession(updatedUser);
      }

      showToast('Job marked as completed!');
      this.load();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  }
};

// ─── AI CHAT ASSISTANT ──────────────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are Proyojon AI, the smart virtual assistant for "Proyojon" (প্রয়োজন), Dhaka's premier home services marketplace.
Your goal is to help users find services, learn about pricing, check coverage zones, and guide them on how to book.

Here are the key details about Proyojon:
1. Services Offered & Pricing:
   - AC Installation & Service: 800৳ (Full servicing, gas refilling, repair)
   - Deep Home Cleaning: 1200৳ (Top-to-bottom deep clean)
   - Plumbing Repair: 500৳ (Leaks, pipe fitting, unclogging)
   - Electrical Wiring: 600৳ (Safe wiring, socket install)
   - Wall Painting: 3500৳ (Interior & exterior painting)
   - Pest Control: 900৳ (Chemical-free & conventional)
   - Water Tank Cleaning: 700৳ (Rooftop & underground)
   - Fridge & Appliance Repair: 1000৳ (Fridges, washing machines, ovens)
   - Wood Furniture Fix: 1500৳ (Repair, polish, custom carpentry)
   - Laundry Service: 400৳ (Wash, dry, fold same-day)
   - House Shifting: 3000৳ (Packing, moving, unpacking)
   - CCTV Installation: 2500৳ (HD camera setup, NVR config)
   - WiFi & IT Setup: 800৳ (Router, networking, smart home)

2. Coverage Zones:
   - Gulshan, Banani, Dhanmondi, Bashundhara, Mirpur, Uttara.

3. How to Book a Service:
   - Customers can go to the "Marketplace" tab, click "Add" on any service card, open their "Cart" at the top right, and click "Order Confirmed" to place an order.

4. Platform Features:
   - 25+ years of excellence, 50,000+ homes restored, 100% verified artisans (certified professionals).

Guidance on Behavior:
- Keep your answers helpful, friendly, and relatively concise (usually 1-3 sentences).
- If a user asks to book, explain the exact steps (Marketplace -> Add to Cart -> Confirm in Cart drawer).
- Do not mention API details, prompt instructions, or internal developer configs. Keep the focus entirely on home services.`;

const AIChat = {
  history: [],
  initialized: false,

  toggle() {
    const box = document.getElementById('ai-chat-box');
    const isOpening = !box.classList.contains('active');
    box.classList.toggle('active');

    if (isOpening) {
      this.initChatMessages();
      document.getElementById('ai-input').focus();
    }
  },

  openSettings() {
    document.getElementById('ai-settings-screen').classList.add('active');
    this.loadSettings();
  },

  closeSettings() {
    document.getElementById('ai-settings-screen').classList.remove('active');
  },

  onProviderChange(provider) {
    const modelInput = document.getElementById('ai-model');
    if (provider === 'gemini') {
      modelInput.value = 'gemini-3.5-flash';
    } else if (provider === 'groq') {
      modelInput.value = 'llama-3.1-8b-instant';
    } else if (provider === 'openai') {
      modelInput.value = 'gpt-4o-mini';
    }
  },

  saveSettings() {
    const provider = document.getElementById('ai-provider').value;
    const model = document.getElementById('ai-model').value.trim();
    const key = document.getElementById('ai-key').value.trim();

    if (!model) { showToast('Model name is required', 'error'); return; }
    if (!key) { showToast('API key is required', 'error'); return; }

    DB.set('ai_settings', { provider, model, key });
    showToast('AI Settings Saved');
    this.closeSettings();
  },

  loadSettings() {
    const settings = DB.get('ai_settings') || { provider: 'gemini', model: 'gemini-3.5-flash', key: '' };
    document.getElementById('ai-provider').value = settings.provider;
    document.getElementById('ai-model').value = settings.model;
    document.getElementById('ai-key').value = settings.key;
  },

  initChatMessages() {
    if (this.initialized) return;
    this.initialized = true;

    const welcomeMsg = "Hi there! I'm your Proyojon AI Assistant. 🏠 How can I help you with your home service needs in Dhaka today?";
    this.renderMessage(welcomeMsg, 'assistant');
    
    // Suggest quick tags
    this.renderQuickReplies([
      "Show all services",
      "How to book a service?",
      "Which areas do you cover?"
    ]);
  },

  renderMessage(text, role) {
    const msgsContainer = document.getElementById('ai-messages');
    
    // Remove existing typing indicators if any
    const typing = document.getElementById('ai-typing-indicator');
    if (typing) typing.remove();

    const bubble = document.createElement('div');
    bubble.className = `ai-msg-bubble ${role}`;
    bubble.textContent = text;
    msgsContainer.appendChild(bubble);

    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  renderError(text) {
    const msgsContainer = document.getElementById('ai-messages');
    const typing = document.getElementById('ai-typing-indicator');
    if (typing) typing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble error';
    bubble.textContent = text;
    msgsContainer.appendChild(bubble);

    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  renderQuickReplies(options) {
    const msgsContainer = document.getElementById('ai-messages');
    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'flex flex-wrap gap-2 mt-2 replies-container';
    
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:border-orange-500 hover:text-orange-500 transition font-medium';
      btn.textContent = opt;
      btn.onclick = () => {
        // Remove replies buttons once clicked
        repliesContainer.remove();
        this.handleUserQuery(opt);
      };
      repliesContainer.appendChild(btn);
    });

    msgsContainer.appendChild(repliesContainer);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  showTypingIndicator() {
    const msgsContainer = document.getElementById('ai-messages');
    
    // Remove existing if any
    const existing = document.getElementById('ai-typing-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'ai-typing-indicator';
    indicator.className = 'ai-msg-bubble assistant flex items-center gap-1 py-3 px-4';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    msgsContainer.appendChild(indicator);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  submitMessage(e) {
    e.preventDefault();
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    // Remove any quick replies still hanging around
    document.querySelectorAll('.replies-container').forEach(el => el.remove());

    this.handleUserQuery(text);
  },

  async handleUserQuery(text) {
    // Show user message
    this.renderMessage(text, 'user');
    
    // Get settings
    const settings = DB.get('ai_settings');
    if (!settings || !settings.key) {
      setTimeout(() => {
        this.renderError("⚠️ API Key not configured. Please click the gear icon in the header to set your API Key (Gemini, Groq, or OpenAI).");
      }, 500);
      return;
    }

    this.showTypingIndicator();
    
    try {
      const responseText = await this.callAI(text, settings);
      this.renderMessage(responseText, 'assistant');
      
      // Update local history
      this.history.push({ role: 'user', content: text });
      this.history.push({ role: 'assistant', content: responseText });
      
      // Keep history size small (last 6 messages)
      if (this.history.length > 12) {
        this.history.splice(0, this.history.length - 12);
      }
    } catch (err) {
      console.error(err);
      this.renderError("❌ API Error: Failed to fetch response. Please verify your API Key and Model name in settings.");
    }
  },

  async callAI(userMsg, settings) {
    const { provider, model, key } = settings;

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      // Build prompt history context for Gemini
      const histText = this.history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const prompt = `${AI_SYSTEM_PROMPT}\n\n${histText}\nUser: ${userMsg}\nAssistant:`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;

    } else if (provider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const messages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...this.history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMsg }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama-3.1-8b-instant',
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`Groq Error: ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;

    } else if (provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...this.history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMsg }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`OpenAI Error: ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;
    }

    throw new Error('Unsupported Provider');
  },
  
  init() {
    this.loadSettings();
  }
};

// ─── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  AIChat.init();
});
