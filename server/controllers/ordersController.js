const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Product = require('../models/Product');
const User = require('../models/User');

function escapeRegex(text) {
  return (text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateComponentsNeeded(order) {
  const furnitureType = (order.furnitureType || order.type || '').toString().toLowerCase();
  if (furnitureType !== 'chair' && furnitureType !== 'chairs') return {};

  return {
    back: 1 * order.quantity,
    seat: 1 * order.quantity,
    arm: 1 * order.quantity,
    mechanism:1 * order.quantity,
    gaslift: 1 * order.quantity,
    castor: 1 * order.quantity,
    chrome: 1 * order.quantity,
    headrest: order.headrest ? 1 * order.quantity : 0
  };
}

async function createOrders(req, res) {
  const payload = req.body;
  const session = await mongoose.startSession();
  try {
    // Accept either an array, a single order object, or an object with an `items` array (common shopkeeper payload)
    let ordersToCreate = [];
    if (Array.isArray(payload)) ordersToCreate = payload;
    else if (payload && Array.isArray(payload.items)) {
      // expand items into individual orders, inheriting shop/shopkeeper from payload
      for (const it of payload.items) {
        ordersToCreate.push({
          shop: payload.shop || payload.shopId,
          furnitureType: it.furnitureType || payload.furnitureType,
          type: it.type || it.category || payload.type,
          backModel: it.productModel || it.backModel || payload.backModel,
          quantity: it.quantity,
          headrest: it.headrest || false,
          shopkeeper: payload.shopkeeper || payload.user || undefined
        });
      }
    } else ordersToCreate = [payload];
    if (!ordersToCreate.length) return res.status(400).json({ success: false, message: 'no_orders' });

    let createdOrders = [];
    // Try to use transactions where available (replica set). If the server is standalone,
    // withTransaction will fail with "Transaction numbers are only allowed on a replica set member or mongos".
    // In that case, fall back to a safe non-transactional mode using atomic findOneAndUpdate calls
    // and compensating updates on failure.
    const runWithTransaction = async () => {
      await session.withTransaction(async () => {
        for (let order of ordersToCreate) {
          // normalize quantity (support nested structures)
          const rawQty = order.quantity ?? order.qty ?? (order.amount ? order.amount : undefined);
          order.quantity = Number(rawQty || 0);
          if (!order || !order.quantity || Number.isNaN(order.quantity) || order.quantity <= 0) {
            console.error('createOrders invalid order payload:', order);
            throw { code: 'invalid_order', message: 'quantity_required', received: order };
          }

          const needed = calculateComponentsNeeded(order);

          // check components availability
          for (const [comp, qty] of Object.entries(needed)) {
            const item = await Item.findOne({ type: comp }).session(session);
            const available = item ? item.quantity : 0;
            if (available < qty) throw { code: 'insufficient_components', message: `insufficient_${comp}`, component: comp, needed: qty, available };
          }

          // check back model availability if specified
          if (order.backModel) {
            // do a case-insensitive exact match on model and prefer furnitureType if provided
            const modelRegex = new RegExp('^' + escapeRegex(order.backModel) + '$', 'i');
            let backItem = null;
            // prefer matching furnitureType with sufficient quantity
            if (order.furnitureType) {
              backItem = await Item.findOne({ type: 'back', model: modelRegex, furnitureType: order.furnitureType, quantity: { $gte: order.quantity } }).session(session);
            }
            // if none with furnitureType, try any furnitureType with enough quantity
            if (!backItem) {
              backItem = await Item.findOne({ type: 'back', model: modelRegex, quantity: { $gte: order.quantity } }).session(session);
            }

            if (!backItem) {
              // gather diagnostic info to help debugging: list matching items (with and without furnitureType)
              const matchesWithFT = await Item.find({ type: 'back', model: modelRegex, furnitureType: order.furnitureType }).session(session).lean();
              const matchesAnyFT = await Item.find({ type: 'back', model: modelRegex }).session(session).lean();
              throw {
                code: 'insufficient_back_model',
                message: 'insufficient_back_model',
                model: order.backModel,
                requested: order.quantity,
                matchesWithFurnitureType: matchesWithFT.map(m => ({ id: m._id.toString(), quantity: m.quantity, furnitureType: m.furnitureType, model: m.model })),
                matchesAnyFurnitureType: matchesAnyFT.map(m => ({ id: m._id.toString(), quantity: m.quantity, furnitureType: m.furnitureType, model: m.model })),
              };
            }

            backItem.quantity -= order.quantity;
            await backItem.save({ session });
          }

          // reserve components
          for (const [comp, qty] of Object.entries(needed)) {
            const item = await Item.findOne({ type: comp }).session(session);
            if (item) {
              item.quantity -= qty;
              await item.save({ session });
            }
          }

          // assign orderNumber if needed
          if (!order.orderNumber) order.orderNumber = `ORD-${Date.now()}`;

          // try to auto-assign factory
          if (!order.assignedFactory) {
            const factory = await User.findOne({ role: 'factory', status: 'active' }).session(session);
            if (factory) {
              order.assignedFactory = factory._id.toString();
              order.status = 'assigned';
            }
          }

          const o = new Order(order);
          await o.save({ session });
          createdOrders.push(o);
        }
      });
    };

    const runWithoutTransaction = async () => {
      // Fallback: perform atomic updates and compensate on failure.
      const compensated = { items: [], backs: [] };
      try {
        for (let order of ordersToCreate) {
          const rawQty = order.quantity ?? order.qty ?? (order.amount ? order.amount : undefined);
          order.quantity = Number(rawQty || 0);
          if (!order || !order.quantity || Number.isNaN(order.quantity) || order.quantity <= 0) {
            console.error('createOrders invalid order payload:', order);
            throw { code: 'invalid_order', message: 'quantity_required', received: order };
          }

          const needed = calculateComponentsNeeded(order);

          // reserve back model atomically if needed
          if (order.backModel) {
            const modelRegex = new RegExp('^' + escapeRegex(order.backModel) + '$', 'i');
            let backItem = null;
            // try to reserve with furnitureType first
            if (order.furnitureType) {
              backItem = await Item.findOneAndUpdate({ type: 'back', model: modelRegex, furnitureType: order.furnitureType, quantity: { $gte: order.quantity } }, { $inc: { quantity: -order.quantity } }, { new: true });
            }
            // if not found, try any furnitureType
            if (!backItem) {
              backItem = await Item.findOneAndUpdate({ type: 'back', model: modelRegex, quantity: { $gte: order.quantity } }, { $inc: { quantity: -order.quantity } }, { new: true });
            }
            if (!backItem) {
              // diagnostics
              const matchesWithFT = await Item.find({ type: 'back', model: modelRegex, furnitureType: order.furnitureType }).lean();
              const matchesAnyFT = await Item.find({ type: 'back', model: modelRegex }).lean();
              throw {
                code: 'insufficient_back_model',
                message: 'insufficient_back_model',
                model: order.backModel,
                requested: order.quantity,
                matchesWithFurnitureType: matchesWithFT.map(m => ({ id: m._id.toString(), quantity: m.quantity, furnitureType: m.furnitureType, model: m.model })),
                matchesAnyFurnitureType: matchesAnyFT.map(m => ({ id: m._id.toString(), quantity: m.quantity, furnitureType: m.furnitureType, model: m.model })),
              };
            }
            compensated.backs.push({ id: backItem._id.toString(), qty: order.quantity });
          }

          // reserve components atomically
          for (const [comp, qty] of Object.entries(needed)) {
            if (qty <= 0) continue;
            const filter = { type: comp, quantity: { $gte: qty } };
            const update = { $inc: { quantity: -qty } };
            const item = await Item.findOneAndUpdate(filter, update, { new: true });
            if (!item) {
              throw { code: 'insufficient_components', message: `insufficient_${comp}`, component: comp, needed: qty };
            }
            compensated.items.push({ id: item._id.toString(), qty });
          }

          // assign orderNumber if needed
          if (!order.orderNumber) order.orderNumber = `ORD-${Date.now()}`;

          // try to auto-assign factory
          if (!order.assignedFactory) {
            const factory = await User.findOne({ role: 'factory', status: 'active' });
            if (factory) {
              order.assignedFactory = factory._id.toString();
              order.status = 'assigned';
            }
          }

          const o = new Order(order);
          await o.save();
          createdOrders.push(o);
        }

        return { success: true };
      } catch (err) {
        // Compensate: restore any decremented component quantities
        try {
          for (const it of compensated.items) {
            await Item.findByIdAndUpdate(it.id, { $inc: { quantity: it.qty } });
          }
          for (const b of compensated.backs) {
            await Item.findByIdAndUpdate(b.id, { $inc: { quantity: b.qty } });
          }
        } catch (compErr) {
          console.error('compensation failed', compErr);
        }
        throw err;
      }
    };

    // Try transactional path first. If it fails due to standalone server, fall back.
    try {
      await runWithTransaction();
    } catch (txErr) {
      console.warn('transactional path failed, attempting non-transactional fallback:', txErr && txErr.message);
      // detect the common standalone-server transaction error and fallback
      if (txErr && typeof txErr.message === 'string' && txErr.message.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        // close session and run fallback without transaction
        try {
          session.endSession();
        } catch (e) {}
        createdOrders = [];
        await runWithoutTransaction();
      } else {
        // rethrow other errors
        throw txErr;
      }
    }

    return res.json({ success: true, orders: createdOrders });
  } catch (err) {
    console.error('createOrders error', err);
    if (err && err.code) return res.status(400).json({ success: false, message: err.message || err.code, details: err });
    return res.status(500).json({ success: false, message: 'server_error' });
  } finally {
    session.endSession();
  }
}

module.exports = { createOrders };
