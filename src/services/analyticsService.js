const {
  Order,
  OrderItem,
  DailyAnalytics,
  MonthlyAnalytics,
  MonthlyPaymentStat,
  PaymentMethod,
  DeliveryMethod,
  Op
} = require('../models');

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthBounds(targetMonthKey) {
  const [year, month] = targetMonthKey.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function dayBounds(targetDayKey) {
  const [year, month, day] = targetDayKey.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { start, end };
}

async function recalculateExpectedReceipts(targetMonthKey, transaction) {
  const { start: monthStart, end: monthEnd } = monthBounds(targetMonthKey);

  const cod = await PaymentMethod.findOne({ where: { name: 'Наложенный платеж' }, transaction });
  if (!cod) return 0;

  const methods = await DeliveryMethod.findAll({ where: { name: ['Белпочта', 'Европочта'] }, transaction });
  const methodIds = methods.map((m) => m.id);

  if (methodIds.length === 0) return 0;

  const orders = await Order.findAll({
    where: {
      createdAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
      PaymentMethodId: cod.id,
      DeliveryMethodId: { [Op.in]: methodIds },
      status: { [Op.in]: ['ACCEPTED', 'ASSEMBLED', 'IN_TRANSIT', 'DELIVERED'] }
    },
    transaction
  });

  return orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
}

async function updateAnalyticsOnOrderCreate(order, transaction) {
  const mKey = monthKey(new Date(order.createdAt));
  const dKey = dayKey(new Date(order.createdAt));
  const { start: monthStart, end: monthEnd } = monthBounds(mKey);
  const { start: dayStart, end: dayEnd } = dayBounds(dKey);

  const [monthly] = await MonthlyAnalytics.findOrCreate({ where: { monthKey: mKey }, defaults: { monthKey: mKey }, transaction });
  const [daily] = await DailyAnalytics.findOrCreate({ where: { dayKey: dKey }, defaults: { dayKey: dKey }, transaction });

  monthly.totalOrdersAmount = Number(monthly.totalOrdersAmount) + Number(order.totalAmount);
  const orderCountMonth = await Order.count({ where: { createdAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd } }, transaction });
  monthly.averageCheck = orderCountMonth ? Number(monthly.totalOrdersAmount) / orderCountMonth : 0;

  daily.revenue = Number(daily.revenue) + Number(order.totalAmount);
  const todayCount = await Order.count({ where: { createdAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd } }, transaction });
  daily.averageCheck = todayCount ? Number(daily.revenue) / todayCount : 0;

  const items = await OrderItem.findAll({ where: { OrderId: order.id }, transaction });
  monthly.soldItemsCount = Number(monthly.soldItemsCount) + items.reduce((acc, i) => acc + i.quantity, 0);

  await monthly.save({ transaction });
  await daily.save({ transaction });

  const [payStat] = await MonthlyPaymentStat.findOrCreate({
    where: { monthKey: mKey, PaymentMethodId: order.PaymentMethodId },
    defaults: { monthKey: mKey, PaymentMethodId: order.PaymentMethodId },
    transaction
  });
  payStat.amount = Number(payStat.amount) + Number(order.totalAmount);
  await payStat.save({ transaction });

  monthly.expectedReceipts = await recalculateExpectedReceipts(mKey, transaction);
  await monthly.save({ transaction });
}

module.exports = { updateAnalyticsOnOrderCreate, recalculateExpectedReceipts, monthKey };
