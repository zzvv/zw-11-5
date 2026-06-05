import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Trash2, AlertTriangle } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import FilterPanel from '../components/FilterPanel'
import ImportExport from '../components/ImportExport'
import ContractForm from '../components/ContractForm'
import ProgressBar from '../components/ProgressBar'
import moment from 'moment'

export default function ContractList() {
  const { contracts, loading, fetchContracts, deleteContract } = useContracts()
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState(null)

  const handleFilter = (filters) => {
    fetchContracts(filters)
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除此合同？')) return
    await deleteContract(id)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case '执行中': return 'bg-primary-100 text-primary-700'
      case '已到期': return 'bg-danger-100 text-danger-700'
      case '已终止': return 'bg-gray-100 text-gray-600'
      case '已归档': return 'bg-success-100 text-success-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getExpiryAlert = (expiryDate, status) => {
    if (status !== '执行中') return null
    const days = moment(expiryDate).diff(moment(), 'days')
    if (days < 0) return { level: 'red', text: '已过期' }
    if (days <= 7) return { level: 'red', text: `${days}天后到期` }
    if (days <= 30) return { level: 'yellow', text: `${days}天后到期` }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">合同管理</h1>
        <div className="flex items-center gap-3">
          <ImportExport />
          <button onClick={() => { setEditingContract(null); setShowForm(true) }} className="btn-primary">
            <Plus size={18} />
            新增合同
          </button>
        </div>
      </div>

      <FilterPanel onFilter={handleFilter} />

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : contracts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          暂无合同数据，点击"新增合同"创建
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const alert = getExpiryAlert(c.expiryDate, c.status)
            return (
              <div key={c._id} className="card py-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/contracts/${c._id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                        {c.name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(c.status)}`}>{c.status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.type}</span>
                      {alert && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${alert.level === 'red' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>
                          <AlertTriangle size={12} />
                          {alert.text}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500 grid grid-cols-4 gap-4">
                      <div>编号: {c.contractNo}</div>
                      <div>甲方: {c.partyA.name}</div>
                      <div>乙方: {c.partyB.name}</div>
                      <div>金额: <span className="font-semibold text-gray-700">¥{c.amount.toLocaleString()}</span></div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar percent={c.executionPercent || 0} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/contracts/${c._id}`} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50">
                      <Eye size={16} />
                    </Link>
                    <button onClick={() => { setEditingContract(c); setShowForm(true) }} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium">编辑</span>
                    </button>
                    <button onClick={() => handleDelete(c._id)} className="p-2 text-gray-400 hover:text-danger-500 rounded-lg hover:bg-gray-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ContractForm contract={editingContract} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
