'use strict';
const { Client } = require('pg');
module.exports.getAllUsers = async () => {
  var client = new Client(process.env.DATABASE_URL);
  client.connect();
  var { rows } = await client.query('SELECT * from users');
  return {
    statusCode: 200,
    body: JSON.stringify({
      data: rows,
    }),
  };
};