const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const ORDER_STATUSES = ['ACCEPTED', 'ASSEMBLED', 'IN_TRANSIT', 'DELIVERED', 'PAID', 'RETURNED'];

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  login: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('ADMIN', 'MANAGER'), allowNull: false, defaultValue: 'MANAGER' }
});

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  orderHistory: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  totalOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isBlacklisted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  personalDiscountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  note: { type: DataTypes.TEXT },
  address: { type: DataTypes.STRING }
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  volume: { type: DataTypes.STRING },
  weight: { type: DataTypes.STRING },
  fragrance: { type: DataTypes.STRING },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  imageUrl: { type: DataTypes.STRING },
  purchaseCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  description: { type: DataTypes.TEXT },
  composition: { type: DataTypes.TEXT },
  stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
});

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const ProductCategory = sequelize.define('ProductCategory', {}, { timestamps: false });

const PaymentMethod = sequelize.define('PaymentMethod', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const DeliveryMethod = sequelize.define('DeliveryMethod', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  deliveryCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }
});

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  orderNumber: { type: DataTypes.STRING, unique: true },
  deliveryAddress: { type: DataTypes.STRING },
  note: { type: DataTypes.TEXT },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM(...ORDER_STATUSES), allowNull: false, defaultValue: 'ACCEPTED' },
  closedAt: { type: DataTypes.DATE }
});

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  itemDiscountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  finalLineAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

const Reminder = sequelize.define('Reminder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  remindAt: { type: DataTypes.DATE, allowNull: false },
  note: { type: DataTypes.TEXT },
  autoCreated: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const MonthlyAnalytics = sequelize.define('MonthlyAnalytics', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  monthKey: { type: DataTypes.STRING, unique: true, allowNull: false },
  soldItemsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  totalOrdersAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  averageCheck: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  expectedReceipts: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }
});

const DailyAnalytics = sequelize.define('DailyAnalytics', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  dayKey: { type: DataTypes.STRING, unique: true, allowNull: false },
  revenue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  averageCheck: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }
});

const MonthlyPaymentStat = sequelize.define('MonthlyPaymentStat', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  monthKey: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }
}, {
  indexes: [{ unique: true, fields: ['monthKey', 'PaymentMethodId'] }]
});

const OrderSequence = sequelize.define('OrderSequence', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  monthKey: { type: DataTypes.STRING, allowNull: false, unique: true },
  lastNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
});

Client.belongsTo(DeliveryMethod, { as: 'preferredDeliveryMethod' });
DeliveryMethod.hasMany(Client, { foreignKey: 'preferredDeliveryMethodId' });

Product.belongsToMany(Category, { through: ProductCategory });
Category.belongsToMany(Product, { through: ProductCategory });

Order.belongsTo(Client);
Order.belongsTo(User, { as: 'manager' });
Order.belongsTo(DeliveryMethod);
Order.belongsTo(PaymentMethod);
Client.hasMany(Order);

OrderItem.belongsTo(Order);
OrderItem.belongsTo(Product);
Order.hasMany(OrderItem);
Product.hasMany(OrderItem);

Reminder.belongsTo(Client);
Reminder.belongsTo(Order);
Reminder.belongsTo(User, { as: 'manager' });

MonthlyPaymentStat.belongsTo(PaymentMethod);
PaymentMethod.hasMany(MonthlyPaymentStat);

Order.beforeCreate(async (order, options) => {
  const now = new Date();
  const month = `${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthKey = `${now.getFullYear()}-${month}`;
  const transaction = options.transaction;

  if (!transaction) {
    throw new Error('Order creation must run inside a transaction');
  }

  await OrderSequence.findOrCreate({
    where: { monthKey },
    defaults: { monthKey, lastNumber: 0 },
    transaction
  });

  await OrderSequence.increment('lastNumber', { by: 1, where: { monthKey }, transaction });
  const sequence = await OrderSequence.findOne({ where: { monthKey }, transaction, lock: transaction.LOCK.UPDATE });
  order.orderNumber = `${month}-${String(sequence.lastNumber).padStart(3, '0')}`;
});

async function ensureDefaultAdmin() {
  const login = process.env.ADMIN_LOGIN || 'admin';
  const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = await User.findOne({ where: { login } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    await User.create({ login, passwordHash, role: 'ADMIN' });
  }
}

module.exports = {
  sequelize,
  Op,
  ORDER_STATUSES,
  User,
  Client,
  Product,
  Category,
  ProductCategory,
  PaymentMethod,
  DeliveryMethod,
  Order,
  OrderItem,
  Reminder,
  MonthlyAnalytics,
  DailyAnalytics,
  MonthlyPaymentStat,
  OrderSequence,
  ensureDefaultAdmin
};
