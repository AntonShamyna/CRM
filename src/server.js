require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { bootstrapDefaults } = require('./scripts/bootstrap');

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.authenticate();
  if (process.env.DB_SYNC_ON_START === 'true') {
    await sequelize.sync();
  }
  await bootstrapDefaults();
  app.listen(PORT, () => console.log(`CRM API listening on port ${PORT}`));
}

start().catch((e) => {
  console.error('Startup failed', e);
  process.exit(1);
});
