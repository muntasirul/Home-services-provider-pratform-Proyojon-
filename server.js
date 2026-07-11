require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Customer = require('./models/Customer');
const Provider = require('./models/Provider');
const Moderator = require('./models/Moderator');
const Booking = require('./models/Booking');
const Area = require('./models/Area');
const Service = require('./models/Service');

const app = express();
const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proyojon';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve frontend files directly

// ─── DATABASE CONNECTION & SEEDING ─────────────────────────────────────────────

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    seedDatabase();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
  });

async function seedDatabase() {
  try {
    // 1. Seed Areas
    const areaCount = await Area.countDocuments();
    if (areaCount === 0) {
      const AREAS = [
        { id: 'area_gulshan',     name: 'Gulshan',      isRestricted: false, postalCode: '1212', description: 'Upscale residential & commercial hub' },
        { id: 'area_banani',      name: 'Banani',       isRestricted: false, postalCode: '1213', description: 'Vibrant neighborhood with dining and shopping' },
        { id: 'area_dhanmondi',   name: 'Dhanmondi',    isRestricted: false, postalCode: '1209', description: 'Cultural and educational residential hub' },
        { id: 'area_bashundhara', name: 'Bashundhara',  isRestricted: true,  postalCode: '1229', description: 'Highly secure private residential area' },
        { id: 'area_mirpur',      name: 'Mirpur',       isRestricted: false, postalCode: '1216', description: 'Densely populated residential neighborhood' },
        { id: 'area_uttara',      name: 'Uttara',       isRestricted: false, postalCode: '1230', description: 'Well-planned residential suburb near airport' },
        { id: 'area_dohs',        name: 'DOHS',         isRestricted: true,  postalCode: '1206', description: 'Secure military housing society' },
        { id: 'area_cantonment',  name: 'Cantonment',   isRestricted: true,  postalCode: '1206', description: 'Highly secure restricted military area' }
      ];
      await Area.insertMany(AREAS);
      console.log('🌱 Seeded Area database');
    }

    // 2. Seed Default Users across separate collections
    const customerCount = await Customer.countDocuments();
    const providerCount = await Provider.countDocuments();
    const moderatorCount = await Moderator.countDocuments();

    if (customerCount === 0 && providerCount === 0 && moderatorCount === 0) {
      // Customer Seed
      const cust = new Customer({
        name: 'Md. Mubassir',
        email: 'customer@proyojon.com',
        password: 'password',
        role: 'customer',
        phone: '+880 1711 111 222',
        zone: 'Bashundhara',
        totalSpent: 0
      });
      await cust.save();

      // Moderator Seed
      const mod = new Moderator({
        name: 'Dr. Md Adnan Arefeen',
        email: 'admin@proyojon.com',
        password: 'password',
        role: 'moderator',
        assignedZone: 'Gulshan'
      });
      await mod.save();

      // Providers Seed
      const SEED_PROVIDERS = [
        {
          name: 'Karim Hossain',
          email: 'karim@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1533 461 586',
          serviceCategory: 'AC Technician',
          skill: 'AC Technician',
          verificationDocument: 'nid_karim.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Bashundhara', 'Gulshan'],
          zone: 'Bashundhara',
          area: 'Bashundhara',
          color: 'bg-red-500',
          initials: 'KH',
          status: 'active',
          avgRating: 4.9,
          completedCount: 12
        },
        {
          name: 'Rahim Mia',
          email: 'rahim@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1711 999 888',
          serviceCategory: 'Plumber',
          skill: 'Plumber',
          verificationDocument: 'nid_rahim.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Banani', 'Gulshan'],
          zone: 'Banani',
          area: 'Banani',
          color: 'bg-teal-500',
          initials: 'RM',
          status: 'active',
          avgRating: 4.7,
          completedCount: 8
        },
        {
          name: 'Nayan Das',
          email: 'nayan@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1811 777 666',
          serviceCategory: 'Electrician',
          skill: 'Electrician',
          verificationDocument: 'nid_nayan.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Dhanmondi'],
          zone: 'Dhanmondi',
          area: 'Dhanmondi',
          color: 'bg-yellow-500',
          initials: 'ND',
          status: 'active',
          avgRating: 4.8,
          completedCount: 15
        },
        {
          name: 'Sumi Akter',
          email: 'sumi@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1911 555 444',
          serviceCategory: 'Cleaning Expert',
          skill: 'Cleaning Expert',
          verificationDocument: 'nid_sumi.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Gulshan', 'Banani'],
          zone: 'Gulshan',
          area: 'Gulshan',
          color: 'bg-pink-500',
          initials: 'SA',
          status: 'active',
          avgRating: 4.9,
          completedCount: 22
        },
        {
          name: 'Niloy Barua',
          email: 'niloy@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1611 333 222',
          serviceCategory: 'Painter',
          skill: 'Painter',
          verificationDocument: 'nid_niloy.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Mirpur', 'Uttara'],
          zone: 'Mirpur',
          area: 'Mirpur',
          color: 'bg-indigo-500',
          initials: 'NB',
          status: 'active',
          avgRating: 4.6,
          completedCount: 4
        },
        {
          name: 'Navid Hasan',
          email: 'navid@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1511 222 111',
          serviceCategory: 'Moving Specialist',
          skill: 'Moving Specialist',
          verificationDocument: 'nid_navid.pdf',
          verifiedStatus: 'Pending',
          coverageZones: ['Mirpur'],
          zone: 'Mirpur',
          area: 'Mirpur',
          color: 'bg-green-600',
          initials: 'NH',
          status: 'active',
          avgRating: 4.5,
          completedCount: 0
        }
      ];

      for (const p of SEED_PROVIDERS) {
        const newProv = new Provider(p);
        await newProv.save();
      }

      console.log('🌱 Seeded role-specific collections in Atlas database');
    }

    // 3. Seed Services
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      const SERVICES = [
        { id:1,  name:'AC Installation & Service', price:800,  cat:'ac',        icon:'❄️',  rating:4.9, desc:'Full AC servicing, gas refilling, installation & repair.' },
        { id:2,  name:'Deep Home Cleaning',        price:1200, cat:'clean',      icon:'🧹', rating:4.8, desc:'Top-to-bottom professional home deep clean.' },
        { id:3,  name:'Plumbing Repair',           price:500,  cat:'plumb',      icon:'🔧', rating:4.7, desc:'Leak fixes, pipe fitting, drainage unclogging.' },
        { id:4,  name:'Electrical Wiring',         price:600,  cat:'elect',      icon:'⚡', rating:4.8, desc:'Safe wiring, socket installation, load upgrades.' },
        { id:5,  name:'Wall Painting',             price:3500, cat:'paint',      icon:'🎨', rating:4.9, desc:'Interior & exterior painting, premium finishes.' },
        { id:6,  name:'Pest Control',              price:900,  cat:'pest',       icon:'🐛', rating:4.6, desc:'Chemical-free & conventional pest elimination.' },
        { id:7,  name:'Water Tank Cleaning',       price:700,  cat:'water',      icon:'💧', rating:4.7, desc:'Rooftop & underground tank hygiene service.' },
        { id:8,  name:'Fridge & Appliance Repair', price:1000, cat:'appliance',  icon:'🛠️', rating:4.7, desc:'All brands, fridge, washing machine, oven.' },
        { id:9,  name:'Wood Furniture Fix',        price:1500, cat:'carpentry',  icon:'🪚', rating:4.8, desc:'Repair, polish & custom carpentry work.' },
        { id:10, name:'Laundry Service',           price:400,  cat:'laundry',    icon:'👕', rating:4.5, desc:'Wash, dry & fold same-day laundry service.' },
        { id:11, name:'House Shifting',            price:3000, cat:'moving',     icon:'🚚', rating:4.6, desc:'Full packing, moving & unpacking service.' },
        { id:12, name:'CCTV Installation',         price:2500, cat:'security',   icon:'🔒', rating:4.8, desc:'HD camera setup, NVR configuration & testing.' },
        { id:13, name:'WiFi & IT Setup',           price:800,  cat:'it',         icon:'💻', rating:4.7, desc:'Router config, networking, smart home setup.' },
      ];
      await Service.insertMany(SERVICES);
      console.log('🌱 Seeded Service database in Atlas');
    }
  } catch (err) {
    console.error('❌ Seeding Database failed:', err);
  }
}

// ─── API ROUTES ────────────────────────────────────────────────────────────────

// 1. Authentication

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, zone, assignedZone, serviceCategory, verificationDocument, coverageZones, color, initials } = req.body;

    // Check duplicate emails across all three collections
    const existsCustomer = await Customer.findOne({ email: email.toLowerCase() });
    const existsProvider = await Provider.findOne({ email: email.toLowerCase() });
    const existsModerator = await Moderator.findOne({ email: email.toLowerCase() });

    if (existsCustomer || existsProvider || existsModerator) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    let newUser;
    if (role === 'customer') {
      newUser = new Customer({ name, email, password, role, phone, zone, totalSpent: 0 });
    } else if (role === 'moderator') {
      newUser = new Moderator({ name, email, password, role, assignedZone });
    } else if (role === 'provider') {
      newUser = new Provider({
        name, email, password, role, phone,
        serviceCategory, skill: serviceCategory,
        verificationDocument, coverageZones,
        zone: coverageZones[0] || 'Gulshan',
        area: coverageZones[0] || 'Gulshan',
        color, initials, status: 'active',
        avgRating: 4.5, completedCount: 0, verifiedStatus: 'Pending'
      });
    } else {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    await newUser.save();

    const returnedUser = newUser.toObject();
    delete returnedUser.password;

    res.status(201).json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    let user;
    if (role === 'customer') {
      user = await Customer.findOne({ email: email.toLowerCase() });
    } else if (role === 'provider') {
      user = await Provider.findOne({ email: email.toLowerCase() });
    } else if (role === 'moderator') {
      user = await Moderator.findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    const returnedUser = user.toObject();
    delete returnedUser.password;

    res.json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Save Profile changes
app.patch('/api/auth/profile', async (req, res) => {
  try {
    const { userId, name, phone, zone } = req.body;
    
    let updated = await Customer.findByIdAndUpdate(userId, { name, phone, zone }, { new: true });
    if (!updated) {
      updated = await Provider.findByIdAndUpdate(userId, { name, phone, zone }, { new: true });
    }
    if (!updated) {
      updated = await Moderator.findByIdAndUpdate(userId, { name, phone }, { new: true });
    }

    if (!updated) return res.status(404).json({ error: 'User not found' });
    
    const returnedUser = updated.toObject();
    delete returnedUser.password;
    res.json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// 2. Areas
app.get('/api/areas', async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve areas' });
  }
});

// 3. Workers
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await Provider.find();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve workers' });
  }
});

// Verification status
app.patch('/api/workers/:id/verify', async (req, res) => {
  try {
    const { status } = req.body;
    const worker = await Provider.findByIdAndUpdate(
      req.params.id,
      { verifiedStatus: status },
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify worker' });
  }
});

// Active status toggle
app.patch('/api/workers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const worker = await Provider.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// Remove worker
app.delete('/api/workers/:id', async (req, res) => {
  try {
    const removed = await Provider.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Worker not found' });
    res.json({ message: 'Worker removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove worker' });
  }
});

// 4. Bookings

// List all (Moderator)
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings' });
  }
});

// List bookings for specific user
app.get('/api/bookings/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the user is a provider or customer
    const provider = await Provider.findById(id);
    let query = {};
    if (provider) {
      query = { providerId: id };
    } else {
      query = { userId: id };
    }

    const bookings = await Booking.find(query);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user bookings' });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { id, userId, userName, items, total } = req.body;
    const newBooking = new Booking({ id, userId, userName, items, total, status: 'pending' });
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (status === 'done') {
      if (booking.providerId) {
        await Provider.findByIdAndUpdate(booking.providerId, { $inc: { completedCount: 1 } });
      }
      await Customer.findByIdAndUpdate(booking.userId, { $inc: { totalSpent: booking.total } });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Assign worker
app.patch('/api/bookings/:id/assign', async (req, res) => {
  try {
    const { providerId } = req.body;
    const status = providerId ? 'confirmed' : 'pending';
    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { providerId, status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign worker' });
  }
});

// 5. Services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// Wildcard fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Launch server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
