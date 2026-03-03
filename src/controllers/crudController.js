function createCrudController(Model, options = {}) {
  const include = options.include || undefined;

  return {
    list: async (req, res) => {
      const rows = await Model.findAll({ include });
      res.json(rows);
    },
    getById: async (req, res) => {
      const row = await Model.findByPk(req.params.id, { include });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    },
    create: async (req, res) => {
      const row = await Model.create(req.body);
      res.status(201).json(row);
    },
    update: async (req, res) => {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.update(req.body);
      res.json(row);
    },
    remove: async (req, res) => {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.destroy();
      res.status(204).send();
    }
  };
}

module.exports = { createCrudController };
