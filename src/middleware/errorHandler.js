const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

function errorHandler(err, req, res, next) {
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ error: 'Duplicate value', details: err.errors?.map((e) => e.message) || [] });
  }

  if (err instanceof ValidationError) {
    return res.status(422).json({ error: 'Validation failed', details: err.errors?.map((e) => e.message) || [] });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ error: 'Related entity does not exist' });
  }

  if (err.message?.startsWith('Invalid status transition')) {
    return res.status(409).json({ error: err.message });
  }

  if (err.message?.includes('not found')) {
    return res.status(404).json({ error: err.message });
  }

  const status = Number(err.statusCode) || 500;
  console.error(err);
  return res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
