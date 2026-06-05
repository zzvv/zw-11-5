const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['采购', '销售', '劳务', '租赁'], required: true },
  partyA: {
    name: { type: String, required: true },
    contact: { type: String },
    address: { type: String }
  },
  partyB: {
    name: { type: String, required: true },
    contact: { type: String },
    address: { type: String }
  },
  amount: { type: Number, required: true, min: 0 },
  signDate: { type: Date, required: true },
  effectiveDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['一次性', '分期', '里程碑'], required: true },
  status: { type: String, enum: ['执行中', '已到期', '已终止', '已归档'], default: '执行中' },
  executedAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  executionPercent: { type: Number, default: 0 },
  relatedOrderNo: { type: String },
  relatedProjectNo: { type: String },
  attachments: [{ name: String, url: String }],
  remarks: { type: String },
  alertSent30: { type: Boolean, default: false },
  alertSent60: { type: Boolean, default: false },
  alertSent90: { type: Boolean, default: false },
  version: { type: Number, default: 1 }
}, { timestamps: true });

contractSchema.pre('save', function(next) {
  this.remainingAmount = this.amount - this.executedAmount;
  this.executionPercent = this.amount > 0 ? Math.round((this.executedAmount / this.amount) * 1000) / 10 : 0;
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
