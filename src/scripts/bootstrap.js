const { ensureDefaultAdmin, PaymentMethod, DeliveryMethod } = require('../models');

async function bootstrapDefaults() {
  await ensureDefaultAdmin();

  for (const name of ['Наличные средства', 'Безналичные средства', 'Наложенный платеж']) {
    await PaymentMethod.findOrCreate({ where: { name }, defaults: { name } });
  }

  for (const item of [
    { name: 'Белпочта', deliveryCost: 0 },
    { name: 'Европочта', deliveryCost: 0 },
    { name: 'СДЭК', deliveryCost: 0 },
    { name: 'Самовывоз', deliveryCost: 0 }
  ]) {
    await DeliveryMethod.findOrCreate({ where: { name: item.name }, defaults: item });
  }
}

module.exports = { bootstrapDefaults };
