const { Sequelize } = require('sequelize');
require('dotenv').config();

const dialect = (process.env.DB_DIALECT || 'mariadb').toLowerCase();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect,
    logging: false,
    dialectOptions: {
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000)
    }
  }
);

module.exports = sequelize;
