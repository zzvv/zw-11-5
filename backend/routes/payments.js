const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Contract = require('../models/Contract');

// 获取合同的付款计划
router.get('/contract/:contractId', async (req, res) => {
  try {
    const plans = await PaymentPlan.find({ contractId: req.params.contractId }).sort({ dueDate: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建付款计划
router.post('/', async (req, res) => {
  try {
    const plan = new PaymentPlan(req.body);
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 更新付款状态
router.put('/:id/pay', async (req, res) => {
  try {
    const { paidAmount, paidDate, paymentMethod } = req.body;
    const plan = await PaymentPlan.findByIdAndUpdate(
      req.params.id,
      { paidAmount, paidDate, paymentMethod, status: '已付款' },
      { new: true }
    );

    // 更新合同已执行金额
    const contract = await Contract.findById(plan.contractId);
    const allPlans = await PaymentPlan.find({ contractId: plan.contractId, status: '已付款' });
    const totalPaid = allPlans.reduce((sum, p) => sum + p.paidAmount, 0);
    contract.executedAmount = totalPaid;
    await contract.save();

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除付款计划
router.delete('/:id', async (req, res) => {
  try {
    await PaymentPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '付款计划已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
