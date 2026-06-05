const express = require('express');
const router = express.Router();
const ChangeRecord = require('../models/ChangeRecord');
const Contract = require('../models/Contract');

// 获取合同的变更记录
router.get('/contract/:contractId', async (req, res) => {
  try {
    const records = await ChangeRecord.find({ contractId: req.params.contractId })
      .sort({ version: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建变更记录
router.post('/', async (req, res) => {
  try {
    const { contractId, changeType, changes, reason, changedBy } = req.body;
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });

    const previousVersion = contract.version;
    const newVersion = previousVersion + 1;

    const record = new ChangeRecord({
      contractId,
      changeType,
      version: newVersion,
      previousVersion,
      changes,
      reason,
      changedBy,
      snapshot: contract.toObject()
    });
    await record.save();

    // 更新合同版本号和字段
    contract.version = newVersion;
    if (changes.field === 'amount') contract.amount = changes.newValue;
    if (changes.field === 'expiryDate') contract.expiryDate = changes.newValue;
    await contract.save();

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 版本对比
router.get('/compare/:contractId/:v1/:v2', async (req, res) => {
  try {
    const { contractId, v1, v2 } = req.params;
    const snap1 = await ChangeRecord.findOne({ contractId, version: Number(v1) }).select('snapshot');
    const snap2 = await ChangeRecord.findOne({ contractId, version: Number(v2) }).select('snapshot');
    res.json({ success: true, data: { v1: snap1?.snapshot, v2: snap2?.snapshot } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
