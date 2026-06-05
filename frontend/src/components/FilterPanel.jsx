import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

const contractTypes = ['采购', '销售', '劳务', '租赁']
const contractStatuses = ['执行中', '已到期', '已终止', '已归档']

export default function FilterPanel({ onFilter }) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    status: '',
    minAmount: '',
    maxAmount: '',
    expiryStart: '',
    expiryEnd: ''
  })

  const handleChange = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    onFilter(next)
  }

  const handleReset = () => {
    const empty = { keyword: '', type: '', status: '', minAmount: '', maxAmount: '', expiryStart: '', expiryEnd: '' }
    setFilters(empty)
    onFilter(empty)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索合同名称、编号、甲方/乙方..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filters.keyword}
            onChange={e => handleChange('keyword', e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary ${showFilters ? 'bg-gray-200' : ''}`}
        >
          <SlidersHorizontal size={16} />
          高级筛选
        </button>
        <button onClick={handleReset} className="btn-secondary text-gray-500">
          <X size={16} />
          重置
        </button>
      </div>

      {showFilters && (
        <div className="card grid grid-cols-4 gap-4">
          <div>
            <label className="form-label">合同类型</label>
            <select className="form-input" value={filters.type} onChange={e => handleChange('type', e.target.value)}>
              <option value="">全部</option>
              {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">合同状态</label>
            <select className="form-input" value={filters.status} onChange={e => handleChange('status', e.target.value)}>
              <option value="">全部</option>
              {contractStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">金额范围</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="最小" className="form-input" value={filters.minAmount} onChange={e => handleChange('minAmount', e.target.value)} />
              <span className="text-gray-400">-</span>
              <input type="number" placeholder="最大" className="form-input" value={filters.maxAmount} onChange={e => handleChange('maxAmount', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">到期时间</label>
            <div className="flex items-center gap-2">
              <input type="date" className="form-input" value={filters.expiryStart} onChange={e => handleChange('expiryStart', e.target.value)} />
              <span className="text-gray-400">-</span>
              <input type="date" className="form-input" value={filters.expiryEnd} onChange={e => handleChange('expiryEnd', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
