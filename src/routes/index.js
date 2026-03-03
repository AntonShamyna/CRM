const express = require('express');
const {
  Client,
  Product,
  Category,
  PaymentMethod,
  DeliveryMethod,
  MonthlyAnalytics,
  DailyAnalytics,
  MonthlyPaymentStat
} = require('../models');
const { createCrudController } = require('../controllers/crudController');
const { login } = require('../controllers/authController');
const { listUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { listOrders, createOrder, updateOrderStatus } = require('../controllers/orderController');
const { listReminders, createReminder, updateReminder, deleteReminder } = require('../controllers/reminderController');
const { auth, allowRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/auth/login', asyncHandler(login));

router.use(auth);

const adminOnly = [allowRoles('ADMIN')];
const adminOrManager = [allowRoles('ADMIN', 'MANAGER')];

router.get('/users', ...adminOnly, asyncHandler(listUsers));
router.post('/users', ...adminOnly, asyncHandler(createUser));
router.get('/users/:id', ...adminOnly, asyncHandler(getUser));
router.put('/users/:id', ...adminOnly, asyncHandler(updateUser));
router.delete('/users/:id', ...adminOnly, asyncHandler(deleteUser));

for (const [path, Model] of [['/clients', Client], ['/products', Product], ['/categories', Category], ['/payment-methods', PaymentMethod], ['/delivery-methods', DeliveryMethod]]) {
  const crud = createCrudController(Model);
  router.get(path, ...adminOrManager, asyncHandler(crud.list));
  router.post(path, ...adminOrManager, asyncHandler(crud.create));
  router.get(`${path}/:id`, ...adminOrManager, asyncHandler(crud.getById));
  router.put(`${path}/:id`, ...adminOrManager, asyncHandler(crud.update));
  router.delete(`${path}/:id`, ...adminOrManager, asyncHandler(crud.remove));
}

router.get('/orders', ...adminOrManager, asyncHandler(listOrders));
router.post('/orders', ...adminOrManager, asyncHandler(createOrder));
router.patch('/orders/:id/status', ...adminOrManager, asyncHandler(updateOrderStatus));

router.get('/reminders', ...adminOrManager, asyncHandler(listReminders));
router.post('/reminders', ...adminOrManager, asyncHandler(createReminder));
router.put('/reminders/:id', ...adminOrManager, asyncHandler(updateReminder));
router.delete('/reminders/:id', ...adminOrManager, asyncHandler(deleteReminder));

router.get('/analytics/monthly', ...adminOrManager, asyncHandler(async (req, res) => res.json(await MonthlyAnalytics.findAll())));
router.get('/analytics/daily', ...adminOrManager, asyncHandler(async (req, res) => res.json(await DailyAnalytics.findAll())));
router.get('/analytics/monthly-payments', ...adminOrManager, asyncHandler(async (req, res) => res.json(await MonthlyPaymentStat.findAll({ include: [PaymentMethod] }))));

module.exports = router;
