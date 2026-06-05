import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { useContracts } from '../context/ContractContext'
import PaymentTimeline from '../components/PaymentTimeline'
import ChangeTree from '../components/ChangeTree'
import ProgressBar from '../components/ProgressBar'
import ContractForm from '../components/ContractForm'
import moment from 'moment'

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deleteContract } = useContracts()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/contracts/${id}`)
      setContract(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确认删除此合同？此操作不可恢复。')) return
    await deleteContract(id)
    navigate('/contracts')
  }

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>
  if (!contract) return <div className="text-center py-12 text-gray-400">合同不存在</div>

  const daysUntilExpiry = moment(contract.expiryDate).diff(moment(), 'days')
  const expiryAlert = contract.status === '执行中' && daysUntilExpiry <= 30
    ? { level: daysUntilExpiry <= 7 ? 'red' : 'yellow', text: `${daysUntilExpiry}天后到期` }
    : null

  const tabs = [
    { key: 'overview', label: '概览' },
    { key: 'payments', label: '付款计划' },
    { key: 'changes', label: '变更记录' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/contracts')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{contract.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">{contract.contractNo}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{contract.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${contract.status === '执行中' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                {contract.status}
              </span>
              {expiryAlert && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${expiryAlert.level === 'red' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>
                  <AlertTriangle size={12} />
                  {expiryAlert.text}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary">
            <Pencil size={16} />
            编辑
          </button>
          <button onClick={handleDelete} className="btn-danger">
            删除
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Execution Progress */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">执行进度</h3>
            <ProgressBar percent={contract.executionPercent || 0} size="lg" />
            <div className="grid grid-cols-3 gap-6 mt-4 text-center">
              <div>
                <div className="text-xl font-bold">¥{contract.amount.toLocaleString()}</div>
                <div className="text-xs text-gray-500">合同金额</div>
              </div>
              <div>
                <div className="text-xl font-bold text-success-600">¥{(contract.executedAmount || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">已执行</div>
              </div>
              <div>
                <div className="text-xl font-bold text-warning-600">¥{(contract.remainingAmount || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">剩余金额</div>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">签订日期</div>
                <div>{moment(contract.signDate).format('YYYY-MM-DD')}</div>
                <div className="text-gray-500">生效日期</div>
                <div>{moment(contract.effectiveDate).format('YYYY-MM-DD')}</div>
                <div className="text-gray-500">到期日期</div>
                <div className={expiryAlert?.level === 'red' ? 'text-danger-600 font-semibold' : ''}>
                  {moment(contract.expiryDate).format('YYYY-MM-DD')}
                </div>
                <div className="text-gray-500">付款方式</div>
                <div>{contract.paymentMethod}</div>
                <div className="text-gray-500">关联订单</div>
                <div>{contract.relatedOrderNo || '-'}</div>
                <div className="text-gray-500">关联项目</div>
                <div>{contract.relatedProjectNo || '-'}</div>
              </div>
            </div>
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">甲乙双方</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-primary-400 pl-4">
                  <div className="text-sm font-semibold">甲方</div>
                  <div className="text-sm text-gray-600 mt-1">{contract.partyA.name}</div>
                  <div className="text-xs text-gray-400 mt-1">联系人: {contract.partyA.contact || '-'} | 地址: {contract.partyA.address || '-'}</div>
                </div>
                <div className="border-l-4 border-success-400 pl-4">
                  <div className="text-sm font-semibold">乙方</div>
                  <div className="text-sm text-gray-600 mt-1">{contract.partyB.name}</div>
                  <div className="text-xs text-gray-400 mt-1">联系人: {contract.partyB.contact || '-'} | 地址: {contract.partyB.address || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          {contract.remarks && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">备注</h3>
              <p className="text-sm text-gray-600">{contract.remarks}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">付款计划</h3>
          <PaymentTimeline contractId={id} amount={contract.amount} />
        </div>
      )}

      {activeTab === 'changes' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">变更记录</h3>
          <ChangeTree contractId={id} />
        </div>
      )}

      {showEdit && <ContractForm contract={contract} onClose={() => { setShowEdit(false); fetchContract() }} />}
    </div>
  )
}
