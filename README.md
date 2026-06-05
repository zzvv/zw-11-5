# 合同全生命周期管理平台 (zw-011)

## 技术栈

- **后端**: Node.js + Express + MongoDB + Mongoose
- **前端**: React 18 + Vite + TailwindCSS + Recharts + react-calendar

## 项目结构

```
zw-011/
├── backend/          # Node.js 后端
│   ├── config/       # 数据库配置
│   ├── models/       # Mongoose 模型
│   ├── routes/       # API 路由
│   ├── utils/        # 工具函数（定时任务）
│   ├── .env          # 环境变量
│   ├── package.json
│   └── server.js     # 入口文件
└── frontend/         # React 前端
    ├── src/
    │   ├── components/  # 组件
    │   ├── context/     # 全局状态
    │   ├── pages/       # 页面
    │   └── ...
    ├── package.json
    └── vite.config.js
```

## 快速开始

### 1. 启动 MongoDB

确保本地 MongoDB 已启动，默认连接 `mongodb://localhost:27017/contract_lifecycle`

### 2. 启动后端

```bash
cd backend
npm install
npm start
```

后端运行在 http://localhost:3001

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

## 功能模块

- **合同档案**: 编号、名称、甲乙双方、金额、日期、类型、付款方式
- **付款计划**: 按节点设置应付金额/日期，到期7天标黄提醒，超期标红
- **变更管理**: 金额调整、延期、补充协议，自动生成新版本，保留历史快照
- **到期预警**: 30/60/90天分级提醒，到期后自动归档
- **执行跟踪**: 关联订单/项目，自动汇总已执行金额、剩余金额、执行百分比
- **到期日历**: 按月查看合同到期和付款节点
- **导入导出**: 支持 JSON 格式的合同台账和付款计划导入导出
