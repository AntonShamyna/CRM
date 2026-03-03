const { Order, OrderItem, Client, Product, DeliveryMethod, PaymentMethod, sequelize } = require('../models');
const {
  closeOrderAndApplyEffects,
  createOrderWithItemsAndAnalytics,
  ensureStatusTransitionAllowed
} = require('../services/orderService');

async function listOrders(req, res) {
  const orders = await Order.findAll({
    include: [
      { model: Client },
      { model: DeliveryMethod },
      { model: PaymentMethod },
      { model: OrderItem, include: [Product] }
    ]
  });
  res.json(orders);
}

async function createOrder(req, res) {
  const order = await createOrderWithItemsAndAnalytics(req.body, req.user.id);
  const created = await Order.findByPk(order.id, { include: [OrderItem] });
  res.status(201).json(created);
}

async function updateOrderStatus(req, res) {
  const status = req.body.status;
  if (!status) return res.status(400).json({ error: 'status is required' });

  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const previousStatus = order.status;

  if (previousStatus === status) return res.json(order);

  ensureStatusTransitionAllowed(previousStatus, status);

  await sequelize.transaction(async (transaction) => {
    order.status = status;
    await order.save({ transaction });
    await closeOrderAndApplyEffects(order, req.user.id, previousStatus, transaction);
  });

  const fresh = await Order.findByPk(order.id, { include: [OrderItem] });
  res.json(fresh);
}

module.exports = { listOrders, createOrder, updateOrderStatus };
