const { Pool } = require('pg');

async function testDatabaseConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/erp-test',
  });

  try {
    console.log('Testing database connection...');
    const result = await pool.query(`
      SELECT
        sa.reason,
        sa.status,
        COUNT(DISTINCT sa.id) as adjustment_count,
        COUNT(sai.id) as item_count
      FROM erp.stock_adjustments sa
      LEFT JOIN erp.stock_adjustment_items sai ON sa.id = sai.adjustment_id
      WHERE sa.reason IN ('damage', 'spoilage')
      GROUP BY sa.reason, sa.status
      ORDER BY sa.reason, sa.status
    `);

    console.log('Database query results:');
    result.rows.forEach(row => {
      console.log(`${row.reason} - ${row.status}: ${row.adjustment_count} adjustments, ${row.item_count} items`);
    });

    // Test the exact query the adjustments API uses
    const adjustmentsQuery = await pool.query(`
      SELECT
        sa.reason,
        COUNT(DISTINCT sa.id) as count,
        COUNT(sai.id) as item_count
      FROM erp.stock_adjustments sa
      LEFT JOIN erp.stock_adjustment_items sai ON sa.id = sai.adjustment_id
      WHERE sa.reason = 'damage'
      GROUP BY sa.reason
    `);

    console.log('\nDamage adjustments query:');
    console.log(adjustmentsQuery.rows);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();