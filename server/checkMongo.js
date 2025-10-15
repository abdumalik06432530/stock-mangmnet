#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/Hamd';
const timeoutMs = parseInt(process.env.MONGO_CHECK_TIMEOUT_MS || '5000', 10);

async function check() {
  let conn;
  try {
    // connect with short timeouts to fail fast when unreachable
    conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      socketTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
      // useUnifiedTopology is default in modern mongoose
    }).asPromise();

    console.log('[ok] Connected to MongoDB server');

    try {
      const admin = conn.db.admin();
      const ping = await admin.ping();
      if (ping && ping.ok) {
        console.log('[ok] Ping successful');
      } else {
        console.warn('[warn] Ping returned unexpected response:', ping);
      }
    } catch (pingErr) {
      console.warn('[warn] Ping failed:', pingErr && pingErr.message ? pingErr.message : pingErr);
    }

    // Try replica set status (non-fatal)
    try {
      const admin = conn.db.admin();
      const replStatus = await admin.command({ replSetGetStatus: 1 });
      if (replStatus && replStatus.ok) {
        console.log('[info] Replica set status retrieved');
        const primary = replStatus.members && replStatus.members.find(m => m.stateStr === 'PRIMARY');
        if (primary) console.log('[info] Primary detected:', primary.name);
        else console.log('[info] No PRIMARY detected in replica set (this may be a standalone server)');
      }
    } catch (rsErr) {
      // replSetGetStatus will error on standalone mongod; that's fine
      console.log('[info] Replica set status not available (standalone mongod or insufficient privileges)');
    }

    // close connection
    await conn.close();
    process.exitCode = 0;
  } catch (err) {
    console.error('[error] MongoDB connectivity check failed:', err && err.message ? err.message : err);
    if (conn && conn.close) try { await conn.close(); } catch (e) {}
    process.exitCode = 2;
  }
}

check();
