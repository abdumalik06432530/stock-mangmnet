#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Item = require('./models/Item');
const Order = require('./models/Order');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/furniture';

async function fetchAll() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const users = await User.find().lean();
    const items = await Item.find().lean();
    const orders = await Order.find().lean();
    const out = { users, items, orders };
    console.log(JSON.stringify(out, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('fetchAllCollections failed', err && err.message ? err.message : err);
    process.exit(2);
  }
}

fetchAll();
