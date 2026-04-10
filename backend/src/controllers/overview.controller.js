const db = require('../config/database');

exports.getDashboard = async (req, res, next) => {
  try {
    const [rentalStats] = await db.query(`
      SELECT COUNT(*) as total_rentals,
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_rentals,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_rentals,
             SUM(total_amount) as total_rental_revenue,
             SUM(deposit_amount) as total_deposits
      FROM rentals
    `);

    const [machineStats] = await db.query(`
      SELECT COUNT(*) as total_machines,
             SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
             SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
             SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
             SUM(CASE WHEN status = 'faulty' THEN 1 ELSE 0 END) as faulty
      FROM machines
    `);

    const [stationCount] = await db.query('SELECT COUNT(*) as total FROM cb_stations WHERE is_active = 1');

    const [transactionStats] = await db.query(`
      SELECT SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
             COUNT(*) as total_transactions
      FROM transactions
    `);

    const [recentRentals] = await db.query('SELECT * FROM rentals ORDER BY created_at DESC LIMIT 5');
    const [recentTransactions] = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5');

    res.json({
      success: true,
      data: {
        rentals: rentalStats[0],
        machines: machineStats[0],
        stations: stationCount[0],
        transactions: transactionStats[0],
        recentRentals,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};
