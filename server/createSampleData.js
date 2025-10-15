// Optional helper to seed sample items and a default admin user.
// Run with: node createSampleData.js (after npm install)

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Item = require('./models/Item');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/furniture';
  await mongoose.connect(uri);
  console.log('connected');

  // create admin if not exists
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    admin = new User({ username: 'admin', password: bcrypt.hashSync('admin123', 10), name: 'System Administrator', role: 'admin' });
    await admin.save();
    console.log('created admin');
  }

  // seed components if missing
  const types = [
    { type: 'back', model: 'Model X', quantity: 50 },
    { type: 'seat', model: 'Standard', quantity: 45 },
    { type: 'arm', model: 'Standard', quantity: 100 },
    { type: 'headrest', model: 'Comfort', quantity: 30 },
    { type: 'mechanism', model: 'Tilt', quantity: 25 },
    { type: 'gaslift', model: 'Class 4', quantity: 40 },
    { type: 'castor', model: 'Standard', quantity: 60 },
    { type: 'chrome', model: 'Premium', quantity: 35 }
  ];

  for (const t of types) {
    let it = await Item.findOne({ type: t.type, model: t.model });
    if (!it) {
      it = new Item(t);
      await it.save();
      console.log('created', t.type);
    }
  }

  console.log('done');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
