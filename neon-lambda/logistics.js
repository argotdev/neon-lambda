'use strict';
const { Client } = require('pg');

// Sales Endpoints
module.exports.getSales = async (event) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  
  try {
    const { rows } = await client.query(`
      SELECT 
        s.id,
        s.order_id,
        s.product_id,
        s.quantity,
        s.total_amount,
        s.created_at,
        s.status
      FROM sales s
      ORDER BY s.created_at DESC
    `);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: rows,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch sales data',
      }),
    };
  } finally {
    await client.end();
  }
};

// Inventory Endpoints
module.exports.getInventory = async (event) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  
  try {
    const { rows } = await client.query(`
      SELECT 
        i.id,
        i.product_id,
        i.quantity,
        i.warehouse_id,
        i.last_updated,
        i.status
      FROM inventory i
      WHERE i.quantity > 0
    `);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: rows,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch inventory data',
      }),
    };
  } finally {
    await client.end();
  }
};

module.exports.updateInventory = async (event) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  
  const { product_id, quantity, warehouse_id } = JSON.parse(event.body);
  
  try {
    const { rows } = await client.query(`
      UPDATE inventory
      SET quantity = quantity + $1,
          last_updated = CURRENT_TIMESTAMP
      WHERE product_id = $2 AND warehouse_id = $3
      RETURNING *
    `, [quantity, product_id, warehouse_id]);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: rows[0],
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update inventory',
      }),
    };
  } finally {
    await client.end();
  }
};

// Fulfillment Endpoints
module.exports.createFulfillment = async (event) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  
  const { order_id, warehouse_id, items } = JSON.parse(event.body);
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Create fulfillment record
    const { rows: [fulfillment] } = await client.query(`
      INSERT INTO fulfillments (order_id, warehouse_id, status, created_at)
      VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [order_id, warehouse_id]);
    
    // Create fulfillment items
    for (const item of items) {
      await client.query(`
        INSERT INTO fulfillment_items (fulfillment_id, product_id, quantity)
        VALUES ($1, $2, $3)
      `, [fulfillment.id, item.product_id, item.quantity]);
      
      // Update inventory
      await client.query(`
        UPDATE inventory
        SET quantity = quantity - $1
        WHERE product_id = $2 AND warehouse_id = $3
      `, [item.quantity, item.product_id, warehouse_id]);
    }
    
    await client.query('COMMIT');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: fulfillment,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create fulfillment',
      }),
    };
  } finally {
    await client.end();
  }
};

module.exports.getFulfillmentStatus = async (event) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  
  const { fulfillment_id } = event.pathParameters;
  
  try {
    const { rows } = await client.query(`
      SELECT 
        f.*,
        json_agg(
          json_build_object(
            'product_id', fi.product_id,
            'quantity', fi.quantity
          )
        ) as items
      FROM fulfillments f
      LEFT JOIN fulfillment_items fi ON f.id = fi.fulfillment_id
      WHERE f.id = $1
      GROUP BY f.id
    `, [fulfillment_id]);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: rows[0],
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch fulfillment status',
      }),
    };
  } finally {
    await client.end();
  }
};