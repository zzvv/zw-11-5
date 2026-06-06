import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Plus, Trash2, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import moment from 'moment'

const MAX_AMOUNT = 999999999.99
const formatMoney = (n) => (n === undefined || n === null || isNaN(n)) ? '0.00' : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PaymentTimeline({ contractId, amount }) {
  const [plans, setPlans] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newPlan, setNewPlan] = useState({ nodeName: '', amount: '', dueDate: '', condition: '' })
  const [error, setError] = useState('')

  const fetchPlans = async () => {
    const res = await axios.get(`/api/payments/contract/${contractId}`)
    setPlans(res.data.data || [])
  }

  useEffect(() => { fetchPlans() }, [contractId])

  const validateNewPlan = () => {
    if (!newPlan.nodeName.trim()) return '请输入节点名称'
    const amt = Number(newPlan.amount)
    if (newPlan.amount === '' || isNaN(amt) || !isFinite(amt)) return '请输入有效的金额'
    if (amt <= 0) return '金额必须大于 0'
    if (amt > MAX_AMOUNT) return `金额不能超过 ${MAX_AMOUNT.toLocaleString()}`
    if (!newPlan.dueDate) return '请选择应付日期'
    return ''
  }

  const handleAdd = async () => {
    const err = validateNewPlan()
    if (err) {
      setError(err)
      return
    }
    setError('')
    try {
      await axios.post('/api/payments', {
        contractId,
        nodeName: newPlan.nodeName,
        amount: Number(newPlan.amount),
        dueDate: new Date(newPlan.dueDate),
        condition: newPlan.condition
      })
      setNewPlan({ nodeName: '', amount: '', dueDate: '', condition: '' })
      setShowAdd(false)
      fetchPlans()
    } catch (e) {
      setError(e.response?.data?.message || '保存失败')
    }
  }

  const handlePay = async (id, planAmount) => {
    const defaultAmount = planAmount?.toFixed?.(2) || ''
    const paidAmount = prompt(`请输入实际付款金额（应付 ¥${formatMoney(planAmount)}）:`, defaultAmount)
    if (paidAmount === null || paidAmount === '') return
    const amt = Number(paidAmount)
    if (isNaN(amt) || !isFinite(amt) || amt <= 0) {
      alert('请输入有效的实付金额（大于 0）')
      return
    }
    if (amt > Number(planAmount)) {
      if (!confirm(`实付金额 ¥${formatMoney(amt)} 大于应付金额 ¥${formatMoney(planAmount)}，是否确认继续？`)) {
        return
      }
    }
    try {
      await axios.put(`/api/payments/${id}/pay`, {
        paidAmount: amt,
        paidDate: new Date(),
        paymentMethod: '银行转账'
      })
      fetchPlans()
    } catch (e) {
      alert(e.response?.data?.message || '操作失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除此付款计划?')) return
    await axios.delete(`/api/payments/${id}`)
    fetchPlans()
  }

  const totalPlanned = plans.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalPaid = plans.reduce((s, p) => s + Number(p.paidAmount || 0), 0)
  const overPlanned = amount && totalPlanned > Number(amount)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-600">
          计划付款: <span className={`font-semibold ${overPlanned ? 'text-danger-600' : ''}`}>¥{formatMoney(totalPlanned)}</span>
          <span className="mx-1">/ 合同金额 ¥{formatMoney(amount)}</span>
          {overPlanned && (
            <span className="inline-flex items-center gap-1 ml-2 text-xs text-danger-700 bg-danger-50 px-2 py-0.5 rounded">
              <AlertTriangle size={12} /> 计划总额已超过合同金额
            </span>
          )}
          <span className="ml-4">已付: <span className="font-semibold text-success-600">¥{formatMoney(totalPaid)}</span></span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
          <Plus size={14} />
          添加节点
        </button>
      </div>

      {showAdd && (
        <div className="card bg-gray-50 space-y-3">
          {error && (
            <div className="text-xs text-danger-700 bg-danger-50 rounded p-2 flex items-center gap-1">
              <AlertTriangle size={12} />{error}
            </div>
          )}
          <div className="grid grid-cols-4 gap-3">
            <input placeholder="节点名称 *" className="form-input" value={newPlan.nodeName} onChange={e => setNewPlan({ ...newPlan, nodeName: e.target.value })} />
            <input placeholder="金额(元) *" type="number" min="0" step="0.01" className="form-input" value={newPlan.amount} onChange={e => setNewPlan({ ...newPlan, amount: e.target.value })} />
            <input type="date" className="form-input" value={newPlan.dueDate} onChange={e => setNewPlan({ ...newPlan, dueDate: e.target.value })} />
            <div className="flex gap-2">
              <input placeholder="付款条件" className="form-input" value={newPlan.condition} onChange={e => setNewPlan({ ...newPlan, condition: e.target.value })} />
              <button onClick={handleAdd} className="btn-primary whitespace-nowrap">保存</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
        {plans.map((plan, i) => {
          const isOverdue = plan.status === '已逾期'
          const isPaid = plan.status === '已付款'
          const isUpcoming = plan.status === '待付款' && moment(plan.dueDate).diff(moment(), 'days') <= 7

          return (
            <div key={plan._id} className="relative">
              <div className={`absolute -left-[31px] w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isPaid ? 'bg-success-500 border-success-500' :
                isOverdue ? 'bg-danger-500 border-danger-500' :
                isUpcoming ? 'bg-warning-500 border-warning-500' :
                'bg-white border-gray-300'
              }`}>
                {isPaid && <CheckCircle size={12} className="text-white" />}
                {isOverdue && <AlertCircle size={12} className="text-white" />}
                {isUpcoming && <Clock size={12} className="text-white" />}
              </div>
              <div className="card py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{plan.nodeName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isPaid ? 'bg-success-100 text-success-700' :
                      isOverdue ? 'bg-danger-100 text-danger-700' :
                      isUpcoming ? 'bg-warning-100 text-warning-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{plan.status}</span>
                    {isUpcoming && <span className="text-xs text-warning-600 font-medium">即将到期</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPaid && <button onClick={() => handlePay(plan._id, plan.amount)} className="text-xs btn-primary">标记付款</button>}
                    <button onClick={() => handleDelete(plan._id)} className="text-gray-400 hover:text-danger-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-3 gap-4">
                  <div>应付金额: <span className="font-semibold">¥{formatMoney(plan.amount)}</span></div>
                  <div>应付日期: {moment(plan.dueDate).format('YYYY-MM-DD')}</div>
                  <div>付款条件: {plan.condition || '-'}</div>
                  {isPaid && (
                    <>
                      <div>实付金额: <span className="font-semibold text-success-600">¥{formatMoney(plan.paidAmount)}</span></div>
                      <div>付款日期: {moment(plan.paidDate).format('YYYY-MM-DD')}</div>
                      <div>付款方式: {plan.paymentMethod}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
