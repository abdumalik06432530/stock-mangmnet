const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin','shopkeeper','factory'], default: 'shopkeeper' },
  shops: { type: [String], default: [] },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
