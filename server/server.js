require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// basic health
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/Hamd';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Bootstrap admin user if none exists
    try {
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminUsername && adminPassword) {
        const existing = await User.findOne({ role: 'admin' }).exec();
        if (!existing) {
          const hashed = await bcrypt.hash(adminPassword, 10);
          const adminUser = new User({ username: adminUsername, password: hashed, name: 'System Administrator', role: 'admin' });
          await adminUser.save();
          console.log('[info] Admin user created from environment variables');
        } else {
          console.log('[info] Admin user already exists');
        }
      } else {
        console.log('[warn] ADMIN_USERNAME or ADMIN_PASSWORD not set; skipping admin bootstrap');
      }
    } catch (e) {
      console.error('[error] Admin bootstrap failed', e && e.message ? e.message : e);
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
