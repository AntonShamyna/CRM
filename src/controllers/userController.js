const bcrypt = require('bcryptjs');
const { User } = require('../models');

function sanitizeUser(user) {
  return { id: user.id, login: user.login, role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

async function listUsers(req, res) {
  const users = await User.findAll();
  res.json(users.map(sanitizeUser));
}

async function getUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json(sanitizeUser(user));
}

async function createUser(req, res) {
  const { login, password, role } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'login and password are required' });
  if (!['ADMIN', 'MANAGER'].includes(role || 'MANAGER')) return res.status(400).json({ error: 'invalid role' });

  const existing = await User.findOne({ where: { login } });
  if (existing) return res.status(409).json({ error: 'Login already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ login, passwordHash, role: role || 'MANAGER' });
  return res.status(201).json(sanitizeUser(user));
}

async function updateUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const patch = {};
  if (req.body.login) patch.login = req.body.login;
  if (req.body.role) {
    if (!['ADMIN', 'MANAGER'].includes(req.body.role)) return res.status(400).json({ error: 'invalid role' });
    patch.role = req.body.role;
  }
  if (req.body.password) {
    patch.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  await user.update(patch);
  return res.json(sanitizeUser(user));
}

async function deleteUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  await user.destroy();
  return res.status(204).send();
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
