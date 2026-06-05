const cron = require('node-cron');
const moment = require('moment');
const Contract = require('../models/Contract');
const PaymentPlan = require('../models/PaymentPlan');

// 每天早上9点执行
const startScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[' + new Date().toISOString() + '] 执行定时提醒任务...');
    const now = new Date();

    // 更新逾期付款状态
    await PaymentPlan.updateMany(
      { status: '待付款', dueDate: { $lt: now } },
      { status: '已逾期' }
    );

    // 更新已到期合同状态
    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lt: now } },
      { status: '已到期' }
    );

    // 到期30/60/90天预警标记
    const d30 = moment().add(30, 'days').toDate();
    const d60 = moment().add(60, 'days').toDate();
    const d90 = moment().add(90, 'days').toDate();

    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d30, $gt: now } },
      { alertSent30: true }
    );
    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d60, $gt: d30 } },
      { alertSent60: true }
    );
    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d90, $gt: d60 } },
      { alertSent90: true }
    );

    // 付款7天预警
    const d7 = moment().add(7, 'days').toDate();
    await PaymentPlan.updateMany(
      { status: '待付款', dueDate: { $lte: d7, $gt: now } },
      { alertSent7: true }
    );

    console.log('定时提醒任务执行完成');
  });
};

module.exports = { startScheduler };
