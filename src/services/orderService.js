const { sequelize, Order, OrderItem, Product, Client, Reminder, MonthlyAnalytics } = require('../models');
const { recalculateExpectedReceipts, monthKey, updateAnalyticsOnOrderCreate } = require('./analyticsService');

const CLOSED_STATUSES = ['PAID', 'RETURNED'];
const STATUS_TRANSITIONS = {
  ACCEPTED: ['ASSEMBLED', 'IN_TRANSIT', 'DELIVERED', 'PAID', 'RETURNED'],
  ASSEMBLED: ['IN_TRANSIT', 'DELIVERED', 'PAID', 'RETURNED'],
  IN_TRANSIT: ['DELIVERED', 'PAID', 'RETURNED'],
  DELIVERED: ['PAID', 'RETURNED'],
  PAID: [],
  RETURNED: []
};

function ensureStatusTransitionAllowed(from, to) {
  if (from === to) return;
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw new Error(`Invalid status transition: ${from} -> ${to}`);
}

async function closeOrderAndApplyEffects(order, actorId, previousStatus, transaction) {
  const isNowClosed = CLOSED_STATUSES.includes(order.status);
  const wasClosed = CLOSED_STATUSES.includes(previousStatus);
  if (!isNowClosed || wasClosed) return;

  order.closedAt = new Date();
  await order.save({ transaction });

  const client = await Client.findByPk(order.ClientId, { transaction });
  if (client) {
    const history = Array.isArray(client.orderHistory) ? client.orderHistory : [];
    if (!history.includes(order.id)) history.push(order.id);
    client.orderHistory = history;
    client.totalOrders += 1;
    if (order.status === 'RETURNED') client.isBlacklisted = true;
    await client.save({ transaction });
  }

  if (order.status === 'PAID') {
    const items = await OrderItem.findAll({ where: { OrderId: order.id }, transaction });
    for (const item of items) {
      const product = await Product.findByPk(item.ProductId, { transaction });
      if (product) {
        product.purchaseCount += item.quantity;
        await product.save({ transaction });
      }
    }
  }

  const remindAt = new Date(order.closedAt.getTime() + 1000 * 60 * 60 * 24 * 28);
  await Reminder.create({
    ClientId: order.ClientId,
    OrderId: order.id,
    managerId: actorId || order.managerId,
    remindAt,
    note: 'Автоматическое напоминание через 4 недели после закрытия заказа',
    autoCreated: true
  }, { transaction });

  const mKey = monthKey(new Date(order.createdAt));
  const monthly = await MonthlyAnalytics.findOne({ where: { monthKey: mKey }, transaction });
  if (monthly) {
    monthly.expectedReceipts = await recalculateExpectedReceipts(mKey, transaction);
    await monthly.save({ transaction });
  }
}

async function createOrderWithItemsAndAnalytics(payload, actorId) {
  return sequelize.transaction(async (transaction) => {
    const client = await Client.findByPk(payload.clientId, { transaction });
    if (!client) throw new Error('Client not found');

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const order = await Order.create({
      ClientId: payload.clientId,
      managerId: actorId,
      DeliveryMethodId: payload.deliveryMethodId,
      PaymentMethodId: payload.paymentMethodId,
      deliveryAddress: payload.deliveryAddress || client.address,
      note: payload.note,
      status: 'ACCEPTED'
    }, { transaction });

    let total = 0;
    for (const row of payload.items) {
      if (!row.productId || !Number.isInteger(row.quantity) || row.quantity < 1) {
        throw new Error('Invalid order item payload');
      }

      const product = await Product.findByPk(row.productId, { transaction });
      if (!product) throw new Error(`Product ${row.productId} not found`);
      const productDiscount = Number(product.discountPercent || 0);
      const clientDiscount = Number(client.personalDiscountPercent || 0);
      const effectiveDiscount = Math.max(0, Math.min(100, productDiscount + clientDiscount));
      const base = Number(product.price) * row.quantity;
      const finalLineAmount = base * (1 - effectiveDiscount / 100);

      await OrderItem.create({
        OrderId: order.id,
        ProductId: product.id,
        quantity: row.quantity,
        unitPrice: product.price,
        itemDiscountPercent: effectiveDiscount,
        finalLineAmount
      }, { transaction });

      product.stockQuantity -= row.quantity;
      await product.save({ transaction });
      total += finalLineAmount;
    }

    order.totalAmount = total;
    await order.save({ transaction });

    await updateAnalyticsOnOrderCreate(order, transaction);

    return order;
  });
}

module.exports = {
  CLOSED_STATUSES,
  ensureStatusTransitionAllowed,
  closeOrderAndApplyEffects,
  createOrderWithItemsAndAnalytics
};
