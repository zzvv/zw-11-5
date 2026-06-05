import { useContracts } from '../context/ContractContext'
import { FileText, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444']

export default function Dashboard() {
  const { stats, contracts } = useContracts()

  const typeData = contracts.reduce((acc, c) => {
    const item = acc.find(x => x.name === c.type)
    if (item) item.value++
    else acc.push({ name: c.type, value: 1 })
    return acc
  }, [])

  const amountByType = contracts.reduce((acc, c) => {
    const item = acc.find(x => x.name === c.type)
    if (item) item.amount += c.amount
    else acc.push({ name: c.type, amount: c.amount })
    return acc
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.totalContracts || 0}</div>
              <div className="text-xs text-gray-500">合同总数</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-success-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.activeContracts || 0}</div>
              <div className="text-xs text-gray-500">执行中</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.expiringSoon || 0}</div>
              <div className="text-xs text-gray-500">30天内到期</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-danger-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">¥{(stats?.totalAmount || 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">合同总金额</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">合同类型分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">各类型合同金额</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={amountByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={v => `¥${v.toLocaleString()}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Execution summary */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">执行概览</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary-600">¥{(stats?.totalAmount || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">合同总金额</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-success-600">¥{(stats?.executedAmount || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">已执行金额</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-warning-600">
              {stats?.totalAmount > 0 ? Math.round((stats.executedAmount / stats.totalAmount) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500 mt-1">执行率</div>
          </div>
        </div>
      </div>
    </div>
  )
}
