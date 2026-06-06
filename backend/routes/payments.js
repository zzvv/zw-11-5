const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Contract = require('../models/Contract');

const MAX_AMOUNT = 999999999.99;
const roundTo2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const validateAmount = (rawVal, { label = '金额', allowZero = true, max = MAX_AMOUNT, upperBound = null, upperLabel = null } = {}) => {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return { valid: false, message: `${label}不能为空`, value: 0 };
  }
  const n = Number(rawVal);
  if (isNaN(n) || !isFinite(n)) {
    return { valid: false, message: `${label}「${rawVal}」不是有效数字`, value: 0 };
  }
  if (!allowZero && n <= 0) {
    return { valid: false, message: `${label}必须大于 0，当前输入为 ${n}`, value: n };
  }
  if (n < 0) {
    return { valid: false, message: `${label}不能小于 0，当前输入为 ${n}`, value: n };
  }
  if (n > max) {
    return { valid: false, message: `${label}不能超过 ${max.toLocaleString()}，当前输入为 ${n.toLocaleString()}`, value: n };
  }
  if (upperBound !== null && n > upperBound) {
    return {
      valid: false,
      message: `${label}不能超过${upperLabel || '上限'} ${upperBound.toLocaleString()}，当前输入为 ${n.toLocaleString()}`,
      value: n
    };
  }
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
    if (!req.body.nodeName || !String(req.body.nodeName).trim()) {
      return res.status(400).json({ success: false, message: '请输入节点名称' });
    }
    if (!req.body.dueDate) {
      return res.status(400).json({ success: false, message: '请选择应付日期' });
    }

    const amountCheck = validateAmount(req.body.amount, {
      label: '付款金额',
      allowZero: false
    });
    if (!amountCheck.valid) {
      return res.status(400).json({ success: false, message: amountCheck.message });
    }

    const contract = await Contract.findById(req.body.contractId);
    if (contract) {
      const allPlans = await PaymentPlan.find({ contractId: req.body.contractId });
      const totalPlanned = allPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
      const finalPayable = Number(contract.finalPayableAmount || contract.amount || 0);
      const remaining = Math.max(0, finalPayable - totalPlanned);

      if (remaining <= 0 && finalPayable > 0) {
        return res.status(400).json({
          success: false,
          message: `合同应付总额 ¥${finalPayable.toFixed(2)} 已被付款计划覆盖（已计划 ¥${totalPlanned.toFixed(2)}），无需新增`
        });
      }
      if (amountCheck.value > remaining && finalPayable > 0) {
        return res.status(400).json({
          success: false,
          message: `本次付款金额 ¥${amountCheck.value.toFixed(2)} 超过剩余可计划金额 ¥${remaining.toFixed(2)}（合同应付 ¥${finalPayable.toFixed(2)}，已计划 ¥${totalPlanned.toFixed(2)}）`
        });
      }
    }

    const plan = new PaymentPlan({
      ...req.body,
      amount: amountCheck.value,
      status: req.body.status || '待付款'
    });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/pay', async (req, res) => {
  try {
    const plan = await PaymentPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: '付款计划不存在' });

    const paidCheck = validateAmount(req.body.paidAmount, {
      label: '实付金额',
      allowZero: false
    });
    if (!paidCheck.valid) {
      return res.status(400).json({ success: false, message: paidCheck.message });
    }

    if (paidCheck.value > Number(plan.amount)) {
      return res.status(400).json({
        success: false,
        message: `实付金额 ¥${paidCheck.value.toFixed(2)} 超过应付金额 ¥${Number(plan.amount).toFixed(2)}，请修正或使用合同抵扣功能处理超额部分`
      });
    }

    const contract = await Contract.findById(plan.contractId);
    if (contract) {
      const otherPaidPlans = await PaymentPlan.find({
        _id: { $ne: plan._id },
        contractId: plan.contractId,
        status: '已付款'
      });
      const totalOthers = otherPaidPlans.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
      const finalPayable = Number(contract.finalPayableAmount || contract.amount || 0);
      const willBePaid = totalOthers + paidCheck.value;
      if (willBePaid > finalPayable && finalPayable > 0) {
        return res.status(400).json({
          success: false,
          message: `本次实付 ¥${paidCheck.value.toFixed(2)} 将使累计实付 ¥${willBePaid.toFixed(2)} 超过合同优惠后应付 ¥${finalPayable.toFixed(2)}，请修正`
        });
      }
    }

    const updatedPlan = await PaymentPlan.findByIdAndUpdate(
      req.params.id,
      {
        paidAmount: paidCheck.value,
        paidDate: req.body.paidDate ? new Date(req.body.paidDate) : new Date(),
        paymentMethod: req.body.paymentMethod || '银行转账',
        status: '已付款'
      },
      { new: true }
    );

    if (contract) {
      const allPaid = await PaymentPlan.find({ contractId: plan.contractId, status: '已付款' });
      const totalPaid = allPaid.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
      const finalPayable = Number(contract.finalPayableAmount || contract.amount || 0);
      contract.executedAmount = totalPaid > finalPayable && finalPayable > 0 ? finalPayable : roundTo2(totalPaid);
      await contract.save();
    }

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const plan = await PaymentPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '付款计划不存在' });
    }
    await PaymentPlan.findByIdAndDelete(req.params.id);
    if (plan.contractId) {
      const contract = await Contract.findById(plan.contractId);
      if (contract) {
        const allPaid = await PaymentPlan.find({ contractId: plan.contractId, status: '已付款' });
        const totalPaid = allPaid.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
        contract.executedAmount = roundTo2(totalPaid);
        await contract.save();
      }
    }
    res.json({ success: true, message: '付款计划已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
