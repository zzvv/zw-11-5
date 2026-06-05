const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const PaymentPlan = require('../models/PaymentPlan');
const moment = require('moment');

// 仪表盘统计
router.get('/stats', async (req, res) => {
  try {
    const totalContracts = await Contract.countDocuments();
    const activeContracts = await Contract.countDocuments({ status: '执行中' });
    const expiredContracts = await Contract.countDocuments({ status: '已到期' });
    const totalAmount = await Contract.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]);
    const executedAmount = await Contract.aggregate([{ $group: { _id: null, sum: { $sum: '$executedAmount' } } }]);

    // 即将到期（30天内）
    const thirtyDaysLater = moment().add(30, 'days').toDate();
    const expiringSoon = await Contract.countDocuments({
      status: '执行中',
      expiryDate: { $lte: thirtyDaysLater, $gte: new Date() }
    });

    // 逾期付款
    const overduePayments = await PaymentPlan.countDocuments({
      status: '待付款',
      dueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        totalContracts,
        activeContracts,
        expiredContracts,
        expiringSoon,
        overduePayments,
        totalAmount: totalAmount[0]?.sum || 0,
        executedAmount: executedAmount[0]?.sum || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 到期日历数据
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;
    const start = moment(`${year}-${month}-01`).startOf('month').toDate();
    const end = moment(`${year}-${month}-01`).endOf('month').toDate();

    const contracts = await Contract.find({
      expiryDate: { $gte: start, $lte: end }
    }).select('name contractNo expiryDate amount status');

    const payments = await PaymentPlan.find({
      dueDate: { $gte: start, $lte: end }
    }).populate('contractId', 'name contractNo');

    res.json({ success: true, data: { contracts, payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 预警列表
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const d7 = moment().add(7, 'days').toDate();
    const d30 = moment().add(30, 'days').toDate();
    const d60 = moment().add(60, 'days').toDate();
    const d90 = moment().add(90, 'days').toDate();

    const alerts = [];

    // 付款逾期/即将到期
    const payments = await PaymentPlan.find({
      $or: [
        { status: '待付款', dueDate: { $lt: now } },
        { status: '待付款', dueDate: { $gte: now, $lte: d7 } }
      ]
    }).populate('contractId', 'name contractNo');

    payments.forEach(p => {
      alerts.push({
        type: p.dueDate < now ? '付款逾期' : '付款即将到期',
        level: p.dueDate < now ? 'red' : 'yellow',
        message: `${p.contractId.name} - ${p.nodeName} 应付 ${p.amount} 元`,
        date: p.dueDate
      });
    });

    // 合同到期预警
    const contracts = await Contract.find({
      status: '执行中',
      expiryDate: { $gte: now, $lte: d90 }
    });

    contracts.forEach(c => {
      const days = moment(c.expiryDate).diff(now, 'days');
      let level = 'green';
      if (days <= 7) level = 'red';
      else if (days <= 30) level = 'yellow';
      alerts.push({
        type: '合同即将到期',
        level,
        message: `${c.name} 剩余 ${days} 天到期`,
        date: c.expiryDate
      });
    });

    res.json({ success: true, data: alerts.sort((a, b) => a.date - b.date) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
