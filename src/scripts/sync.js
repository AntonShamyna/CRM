require('dotenv').config();
const { sequelize } = require('../models');
const { bootstrapDefaults } = require('./bootstrap');

async function run() {
  await sequelize.authenticate();
  await sequelize.sync();
  await bootstrapDefaults();
  console.log('DB synced and defaults created');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
