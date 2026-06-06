const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Contract = require('../models/Contract');

const MAX_AMOUNT = 999999999.99;
const roundTo2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const validateAmount = (val, { label = '金额', allowZero = true, max = MAX_AMOUNT } = {}) => {
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return { valid: false, message: `${label}必须是有效数字` };
  if (!allowZero && n <= 0) return { valid: false, message: `${label}必须大于 0` };
  if (n < 0) return { valid: false, message: `${label}不能小于 0` };
  if (n > max) return { valid: false, message: `${label}不能超过 ${max.toLocaleString()}` };
  return { valid: true, value: roundTo2(n) };
};

router.get('/contract/:contractId', async (req, res) => {
  try {
    const plans = await PaymentPlan.find({ contractId: req.params.contractId }).sort({ dueDate: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const amountCheck = validateAmount(req.body.amount, { label: '付款金额', allowZero: false });
    if (!amountCheck.valid) {
      return res.status(400).json({ success: false, message: amountCheck.message });
    }

    const contract = await Contract.findById(req.body.contractId);
    if (contract) {
      const allPlans = await PaymentPlan.find({ contractId: req.body.contractId });
      const totalPlanned = allPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, Number(contract.finalPayableAmount || contract.amount || 0) - totalPlanned);
      if (amountCheck.value > remaining && remaining > 0) {
        return res.status(400).json({
          success: false,
          message: `付款计划总额不能超过剩余应付金额 ¥${remaining.toFixed(2)}，当前已计划 ¥${totalPlanned.toFixed(2)}`
        });
      }
    }

    const plan = new PaymentPlan({ ...req.body, amount: amountCheck.value });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/pay', async (req, res) => {
  try {
    const paidAmountCheck = validateAmount(req.body.paidAmount, { label: '实付金额', allowZero: false });
    if (!paidAmountCheck.valid) {
      return res.status(400).json({ success: false, message: paidAmountCheck.message });
    }

    const plan = await PaymentPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: '付款计划不存在' });

    if (paidAmountCheck.value > Number(plan.amount)) {
      return res.status(400).json({
        success: false,
        message: `实付金额 ¥${paidAmountCheck.value.toFixed(2)} 不能超过应付金额 ¥${Number(plan.amount).toFixed(2)}`
      });
    }

    const updatedPlan = await PaymentPlan.findByIdAndUpdate(
      req.params.id,
      {
        paidAmount: paidAmountCheck.value,
        paidDate: req.body.paidDate ? new Date(req.body.paidDate) : new Date(),
        paymentMethod: req.body.paymentMethod,
        status: '已付款'
      },
      { new: true }
    );

    const contract = await Contract.findById(plan.contractId);
    if (contract) {
      const allPlans = await PaymentPlan.find({ contractId: plan.contractId, status: '已付款' });
      const totalPaid = allPlans.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
      const finalPayable = Number(contract.finalPayableAmount || contract.amount || 0);
      contract.executedAmount = totalPaid > finalPayable ? finalPayable : roundTo2(totalPaid);
      await contract.save();
    }

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await PaymentPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '付款计划已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
