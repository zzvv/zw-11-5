const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const ChangeRecord = require('../models/ChangeRecord');

// 获取合同列表（支持筛选排序）
router.get('/', async (req, res) => {
  try {
    const { type, status, minAmount, maxAmount, expiryStart, expiryEnd, sortBy, order, keyword } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
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

// 获取单个合同
router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建合同
router.post('/', async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 更新合同
router.put('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 删除合同
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

// 批量导入
router.post('/import', async (req, res) => {
  try {
    const { contracts } = req.body;
    const result = await Contract.insertMany(contracts, { ordered: false });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
