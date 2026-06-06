const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const ChangeRecord = require('../models/ChangeRecord');
const MAX_AMOUNT = 999999999.99;

const safeNumber = (val, def = 0) => {
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return def;
  return n;
};

router.get('/', async (req, res) => {
  try {
    const { type, status, minAmount, maxAmount, expiryStart, expiryEnd, sortBy, order, keyword } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        const min = safeNumber(minAmount);
        if (min >= 0) filter.amount.$gte = min;
      }
      if (maxAmount) {
        const max = safeNumber(maxAmount);
        if (max >= 0) filter.amount.$lte = Math.min(max, MAX_AMOUNT);
      }
    }
    if (expiryStart || expiryEnd) {
      filter.expiryDate = {};
      if (expiryStart) filter.expiryDate.$gte = new Date(expiryStart);
      if (expiryEnd) filter.expiryDate.$lte = new Date(expiryEnd);
    }
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { contractNo: { $regex: keyword, $options: 'i' } },
        { 'partyA.name': { $regex: keyword, $options: 'i' } },
        { 'partyB.name': { $regex: keyword, $options: 'i' } }
      ];
    }

    const sort = {};
    if (sortBy) sort[sortBy] = order === 'desc' ? -1 : 1;
    else sort.createdAt = -1;

    const contracts = await Contract.find(filter).sort(sort);
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/amount-preview', async (req, res) => {
  try {
    const { data, errors } = Contract.validateAndCompute(req.body || {});
    res.json({
      success: true,
      data,
      warnings: errors
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data: computed, errors } = Contract.validateAndCompute(req.body || {});
    const payload = { ...req.body, ...computed };

    const contract = new Contract(payload);
    await contract.save();
    res.status(201).json({
      success: true,
      data: contract,
      warnings: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await Contract.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: '合同不存在' });

    const merged = { ...existing.toObject(), ...req.body };
    const { data: computed, errors } = Contract.validateAndCompute(merged);

    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ...computed },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      data: contract,
      warnings: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Contract.findByIdAndDelete(req.params.id);
    await require('../models/PaymentPlan').deleteMany({ contractId: req.params.id });
    await ChangeRecord.deleteMany({ contractId: req.params.id });
    res.json({ success: true, message: '合同已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { contracts } = req.body;
    if (!Array.isArray(contracts)) {
      return res.status(400).json({ success: false, message: '导入数据格式错误' });
    }
    const normalized = contracts.map(c => {
      const { data } = Contract.validateAndCompute(c);
      return { ...c, ...data };
    });
    const result = await Contract.insertMany(normalized, { ordered: false });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
