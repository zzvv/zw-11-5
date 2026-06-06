const mongoose = require('mongoose');

const MAX_AMOUNT = 999999999.99;
const MIN_AMOUNT = 0;
const MAX_DISCOUNT_PERCENT = 100;

const validateAmount = (val) => {
  if (val === undefined || val === null) return true;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return false;
  if (num < MIN_AMOUNT) return false;
  if (num > MAX_AMOUNT) return false;
  return true;
};

const roundTo2 = (n) => Math.round(Number(n) * 100) / 100;

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
  amount: {
    type: Number,
    required: true,
    min: MIN_AMOUNT,
    max: MAX_AMOUNT,
    validate: {
      validator: validateAmount,
      message: `合同金额必须在 ${MIN_AMOUNT} 到 ${MAX_AMOUNT} 之间的有效数字`
    }
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: MIN_AMOUNT,
    validate: {
      validator: function(val) {
        if (!validateAmount(val)) return false;
        if (Number(val) > Number(this.amount || 0)) return false;
        return true;
      },
      message: '优惠金额必须为有效数字且不能超过合同金额'
    }
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: MAX_DISCOUNT_PERCENT,
    validate: {
      validator: (val) => {
        if (val === undefined || val === null) return true;
        const num = Number(val);
        if (isNaN(num) || !isFinite(num)) return false;
        return num >= 0 && num <= MAX_DISCOUNT_PERCENT;
      },
      message: `优惠比例必须在 0 到 ${MAX_DISCOUNT_PERCENT} 之间`
    }
  },
  deductibleAmount: {
    type: Number,
    default: 0,
    min: MIN_AMOUNT,
    validate: {
      validator: function(val) {
        if (!validateAmount(val)) return false;
        const billed = Number(this.billedAmount || 0);
        if (billed > 0 && Number(val) > billed) return false;
        return true;
      },
      message: '抵扣金额必须为有效数字且不能超过已计费金额'
    }
  },
  billedAmount: {
    type: Number,
    default: 0,
    min: MIN_AMOUNT,
    validate: {
      validator: validateAmount,
      message: `计费金额必须在 ${MIN_AMOUNT} 到 ${MAX_AMOUNT} 之间的有效数字`
    }
  },
  signDate: { type: Date, required: true },
  effectiveDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['一次性', '分期', '里程碑'], required: true },
  status: { type: String, enum: ['执行中', '已到期', '已终止', '已归档'], default: '执行中' },
  executedAmount: { type: Number, default: 0, min: MIN_AMOUNT },
  remainingAmount: { type: Number, default: 0, min: MIN_AMOUNT },
  finalPayableAmount: { type: Number, default: 0, min: MIN_AMOUNT },
  netPayableAmount: { type: Number, default: 0, min: MIN_AMOUNT },
  executionPercent: { type: Number, default: 0, min: 0, max: 100 },
  relatedOrderNo: { type: String },
  relatedProjectNo: { type: String },
  attachments: [{ name: String, url: String }],
  remarks: { type: String },
  alertSent30: { type: Boolean, default: false },
  alertSent60: { type: Boolean, default: false },
  alertSent90: { type: Boolean, default: false },
  version: { type: Number, default: 1 }
}, { timestamps: true });

contractSchema.pre('validate', function(next) {
  if (this.amount !== undefined && this.amount !== null) {
    this.amount = roundTo2(this.amount);
  }
  if (this.discountAmount !== undefined && this.discountAmount !== null) {
    this.discountAmount = roundTo2(this.discountAmount);
  }
  if (this.discountPercent !== undefined && this.discountPercent !== null) {
    this.discountPercent = roundTo2(this.discountPercent);
  }
  if (this.deductibleAmount !== undefined && this.deductibleAmount !== null) {
    this.deductibleAmount = roundTo2(this.deductibleAmount);
  }
  if (this.billedAmount !== undefined && this.billedAmount !== null) {
    this.billedAmount = roundTo2(this.billedAmount);
  }
  if (this.executedAmount !== undefined && this.executedAmount !== null) {
    this.executedAmount = roundTo2(this.executedAmount);
  }
  next();
});

contractSchema.pre('save', function(next) {
  const amount = Number(this.amount) || 0;
  const discountAmount = Number(this.discountAmount) || 0;
  const discountPercent = Number(this.discountPercent) || 0;
  const deductibleAmount = Number(this.deductibleAmount) || 0;
  const billedAmount = Number(this.billedAmount) || 0;
  let executedAmount = Number(this.executedAmount) || 0;

  let computedDiscount = discountAmount;
  if (discountPercent > 0 && discountAmount === 0) {
    computedDiscount = roundTo2(amount * (discountPercent / 100));
  }
  if (computedDiscount > amount) computedDiscount = amount;

  const finalPayableAmount = roundTo2(Math.max(0, amount - computedDiscount));

  if (executedAmount > finalPayableAmount) {
    executedAmount = finalPayableAmount;
  }
  this.executedAmount = executedAmount;

  this.finalPayableAmount = finalPayableAmount;
  this.remainingAmount = roundTo2(Math.max(0, finalPayableAmount - executedAmount));
  this.netPayableAmount = roundTo2(Math.max(0, Math.max(0, billedAmount - deductibleAmount) - executedAmount));
  this.executionPercent = finalPayableAmount > 0
    ? roundTo2((executedAmount / finalPayableAmount) * 100)
    : 0;

  if (this.executionPercent > 100) this.executionPercent = 100;
  if (this.executionPercent < 0) this.executionPercent = 0;

  next();
});

contractSchema.statics.validateAndCompute = function(payload, options = {}) {
  const strict = options.strict === true;
  const errors = [];
  const warnings = [];
  const result = {};
  const raw = {};

  const checkAmount = (key, label, opts = {}) => {
    const { required = false, maxUpper = MAX_AMOUNT, upperBound = null, upperLabel = null } = opts;
    const rawVal = payload[key];
    const num = Number(rawVal);
    const state = { valid: true, value: 0 };

    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (required) {
        errors.push(`${label}不能为空，请填写`);
        state.valid = false;
      }
      state.value = 0;
      raw[key] = rawVal;
      return state;
    }

    if (isNaN(num) || !isFinite(num)) {
      errors.push(`${label}「${rawVal}」不是有效数字，请输入合法数字`);
      state.valid = false;
    } else if (num < MIN_AMOUNT) {
      errors.push(`${label}不能小于 ${MIN_AMOUNT}，当前输入为 ${num}`);
      state.valid = false;
    } else if (num > maxUpper) {
      errors.push(`${label}不能大于 ${maxUpper.toLocaleString()}，当前输入为 ${num.toLocaleString()}`);
      state.valid = false;
    } else if (upperBound !== null && num > upperBound) {
      state.valid = false;
      errors.push(`${label}不能超过${upperLabel || '上限'} ${upperBound.toLocaleString()}，当前输入为 ${num.toLocaleString()}`);
    }

    if (!state.valid && !strict) {
      warnings.push(`${label}输入异常，预览中按边界值展示，实际保存前请修正`);
    }

    state.value = (isNaN(num) || !isFinite(num)) ? 0 : roundTo2(Math.max(MIN_AMOUNT, Math.min(maxUpper, num)));
    raw[key] = rawVal;
    return state;
  };

  const amountState = checkAmount('amount', '合同金额', { required: true });
  result.amount = amountState.value;
  if (!amountState.valid && strict) {
    return { data: null, errors, warnings, raw };
  }

  const discountState = checkAmount('discountAmount', '优惠金额', {
    maxUpper: result.amount,
    upperBound: result.amount,
    upperLabel: '合同金额'
  });
  result.discountAmount = discountState.value;

  const percentNum = Number(payload.discountPercent);
  if (payload.discountPercent !== undefined && payload.discountPercent !== null && payload.discountPercent !== '') {
    if (isNaN(percentNum) || !isFinite(percentNum)) {
      errors.push(`优惠比例「${payload.discountPercent}」不是有效数字`);
      result.discountPercent = 0;
    } else if (percentNum < 0) {
      errors.push(`优惠比例不能小于 0%，当前输入为 ${percentNum}%`);
      result.discountPercent = 0;
    } else if (percentNum > MAX_DISCOUNT_PERCENT) {
      errors.push(`优惠比例不能大于 ${MAX_DISCOUNT_PERCENT}%，当前输入为 ${percentNum}%`);
      result.discountPercent = MAX_DISCOUNT_PERCENT;
    } else {
      result.discountPercent = roundTo2(percentNum);
    }
    raw.discountPercent = payload.discountPercent;
  } else {
    result.discountPercent = 0;
    raw.discountPercent = payload.discountPercent;
  }

  const billedState = checkAmount('billedAmount', '已计费金额');
  result.billedAmount = billedState.value;

  const deductibleUpper = result.billedAmount > 0 ? result.billedAmount : MAX_AMOUNT;
  const deductibleLabel = result.billedAmount > 0 ? `已计费金额 (${result.billedAmount.toLocaleString()})` : null;
  const deductibleState = checkAmount('deductibleAmount', '抵扣金额', {
    maxUpper: deductibleUpper,
    upperBound: result.billedAmount > 0 ? result.billedAmount : null,
    upperLabel: deductibleLabel
  });
  result.deductibleAmount = deductibleState.value;

  let computedDiscount = result.discountAmount;
  if (result.discountPercent > 0 && (Number(payload.discountAmount) <= 0 || isNaN(Number(payload.discountAmount)))) {
    computedDiscount = roundTo2(result.amount * (result.discountPercent / 100));
  }
  if (computedDiscount > result.amount) computedDiscount = result.amount;

  const finalPayableAmount = roundTo2(Math.max(0, result.amount - computedDiscount));

  const executedState = checkAmount('executedAmount', '已执行/实付金额', {
    maxUpper: finalPayableAmount,
    upperBound: finalPayableAmount,
    upperLabel: `优惠后应付金额 (${finalPayableAmount.toLocaleString()})`
  });
  result.executedAmount = executedState.value;
  result.finalPayableAmount = finalPayableAmount;
  result.remainingAmount = roundTo2(Math.max(0, finalPayableAmount - result.executedAmount));
  result.netPayableAmount = roundTo2(Math.max(0, Math.max(0, result.billedAmount - result.deductibleAmount) - result.executedAmount));
  result.executionPercent = finalPayableAmount > 0
    ? roundTo2((result.executedAmount / finalPayableAmount) * 100)
    : 0;
  if (result.executionPercent > 100) result.executionPercent = 100;
  if (result.executionPercent < 0) result.executionPercent = 0;

  return { data: result, errors, warnings, raw };
};

module.exports = mongoose.model('Contract', contractSchema);
