const { Reminder, Client, Order } = require('../models');

async function listReminders(req, res) {
  const reminders = await Reminder.findAll({ include: [Client, Order] });
  res.json(reminders);
}

async function createReminder(req, res) {
  const reminder = await Reminder.create({ ...req.body, managerId: req.user.id, autoCreated: false });
  res.status(201).json(reminder);
}

async function updateReminder(req, res) {
  const reminder = await Reminder.findByPk(req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  await reminder.update(req.body);
  res.json(reminder);
}

async function deleteReminder(req, res) {
  const reminder = await Reminder.findByPk(req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  await reminder.destroy();
  res.status(204).send();
}

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };
