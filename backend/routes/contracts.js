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
    const result = Contract.validateAndCompute(req.body || {}, { preview: true });
    res.json({
      success: true,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
      raw: result.raw,
      validFields: result.validFields
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const computed = Contract.validateAndCompute(req.body || {}, { strict: true });
    if (computed.errors && computed.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '金额校验失败，请修正后再提交',
        errors: computed.errors,
        warnings: computed.warnings,
        raw: computed.raw
      });
    }
    const payload = { ...req.body, ...computed.data };
    const contract = new Contract(payload);
    await contract.save();
    res.status(201).json({
      success: true,
      data: contract,
      warnings: (computed.warnings || []).length > 0 ? computed.warnings : undefined
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
    const computed = Contract.validateAndCompute(merged, { strict: true });
    if (computed.errors && computed.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '金额校验失败，请修正后再提交',
        errors: computed.errors,
        warnings: computed.warnings,
        raw: computed.raw
      });
    }
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ...computed.data },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      data: contract,
      warnings: (computed.warnings || []).length > 0 ? computed.warnings : undefined
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
    const importErrors = [];
    const normalized = [];
    contracts.forEach((c, idx) => {
      const result = Contract.validateAndCompute(c, { strict: true });
      if (result.errors && result.errors.length > 0) {
        importErrors.push({ row: idx + 1, contractNo: c.contractNo, errors: result.errors });
      } else {
        normalized.push({ ...c, ...result.data });
      }
    });
    if (normalized.length === 0) {
      return res.status(400).json({
        success: false,
        message: '全部数据校验失败，未导入任何合同',
        importErrors
      });
    }
    const result = await Contract.insertMany(normalized, { ordered: false });
    res.json({
      success: true,
      data: result,
      skipped: contracts.length - result.length,
      importErrors: importErrors.length > 0 ? importErrors : undefined
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
