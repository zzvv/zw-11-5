const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const contractRoutes = require('./routes/contracts');
const paymentRoutes = require('./routes/payments');
const changeRoutes = require('./routes/changes');
const dashboardRoutes = require('./routes/dashboard');
const { startScheduler } = require('./utils/scheduler');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/changes', changeRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

startScheduler();

app.listen(PORT, () => {
  console.log(`合同全生命周期管理平台后端服务已启动，端口: ${PORT}`);
});

module.exports = app;
