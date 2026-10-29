const dashboardService = require('../services/dashboard.service');

async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboardData();
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard
};
