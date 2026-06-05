const mongoose = require('mongoose');

const paymentPlanSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  nodeName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  condition: { type: String },
  status: { type: String, enum: ['待付款', '已付款', '已逾期'], default: '待付款' },
  paidDate: { type: Date },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  alertSent7: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);
