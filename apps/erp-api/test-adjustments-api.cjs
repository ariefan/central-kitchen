const { Pool } = require('pg');

async function testAdjustmentsAPI() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/erp-test',
  });

  try {
    console.log('Testing adjustments analysis query...');

    // This is the exact query from the adjustments API
    const query = `
      SELECT
        sa.reason,
        COUNT(sai.id) as item_count,
        COUNT(DISTINCT sa.id) as adjustment_count
      FROM erp.stock_adjustments sa
      LEFT JOIN erp.stock_adjustment_items sai ON sa.id = sai.adjustment_id
      WHERE sa.reason = 'damage'
      GROUP BY sa.reason
    `;

    const result = await pool.query(query);
    console.log('Query results:', result.rows);

    // Test without WHERE clause
    const allQuery = `
      SELECT
        sa.reason,
        COUNT(sai.id) as item_count,
        COUNT(DISTINCT sa.id) as adjustment_count
      FROM erp.stock_adjustments sa
      LEFT JOIN erp.stock_adjustment_items sai ON sa.id = sai.adjustment_id
      GROUP BY sa.reason
      ORDER BY sa.reason
    `;

    const allResult = await pool.query(allQuery);
    console.log('\nAll reasons:', allResult.rows);

  } catch (error) {
    console.error('Query error:', error);
  } finally {
    await pool.end();
  }
}

testAdjustmentsAPI();