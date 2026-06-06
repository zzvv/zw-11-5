import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Plus, Trash2, AlertTriangle, Ban } from 'lucide-react'
import axios from 'axios'
import moment from 'moment'

const MAX_AMOUNT = 999999999.99
const formatMoney = (n) => (n === undefined || n === null || isNaN(n)) ? '0.00' : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PaymentTimeline({ contractId, amount }) {
  const [plans, setPlans] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newPlan, setNewPlan] = useState({ nodeName: '', amount: '', dueDate: '', condition: '' })
  const [addError, setAddError] = useState('')
  const [addFieldErrors, setAddFieldErrors] = useState({})

  const fetchPlans = async () => {
    const res = await axios.get(`/api/payments/contract/${contractId}`)
    setPlans(res.data.data || [])
  }

  useEffect(() => { fetchPlans() }, [contractId])

  const validateNewPlan = () => {
    const errs = {}
    if (!newPlan.nodeName.trim()) errs.nodeName = '请输入节点名称'
    const rawAmt = newPlan.amount
    if (rawAmt === '' || rawAmt === undefined || rawAmt === null) {
      errs.amount = '请输入付款金额'
    } else {
      const num = Number(rawAmt)
      if (isNaN(num) || !isFinite(num)) {
        errs.amount = `「${rawAmt}」不是有效数字，请输入合法数字`
      } else if (num <= 0) {
        errs.amount = `付款金额必须大于 0，当前输入为 ${rawAmt}`
      } else if (num > MAX_AMOUNT) {
        errs.amount = `付款金额不能超过 ${MAX_AMOUNT.toLocaleString()}，当前输入为 ${num.toLocaleString()}`
      }
    }
    if (!newPlan.dueDate) errs.dueDate = '请选择应付日期'
    setAddFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAdd = async () => {
    setAddError('')
    if (!validateNewPlan()) return
    try {
      await axios.post('/api/payments', {
        contractId,
        nodeName: newPlan.nodeName,
        amount: newPlan.amount,
        dueDate: new Date(newPlan.dueDate),
        condition: newPlan.condition
      })
      setNewPlan({ nodeName: '', amount: '', dueDate: '', condition: '' })
      setAddFieldErrors({})
      setShowAdd(false)
      fetchPlans()
    } catch (e) {
      const msg = e.response?.data?.message || '保存失败，请检查输入'
      setAddError(msg)
    }
  }

  const handlePay = async (id, planAmount) => {
    const defaultAmount = planAmount?.toFixed?.(2) || ''
    const paidInput = prompt(`请输入实际付款金额（应付 ¥${formatMoney(planAmount)}）:`, defaultAmount)
    if (paidInput === null || paidInput === '') return

    const paidNum = Number(paidInput)
    if (paidInput === '' || isNaN(paidNum) || !isFinite(paidNum)) {
      alert(`「${paidInput}」不是有效数字，请输入合法的金额`)
      return
    }
    if (paidNum <= 0) {
      alert(`实付金额必须大于 0，当前输入为 ${paidInput}`)
      return
    }
    if (paidNum > MAX_AMOUNT) {
      alert(`实付金额不能超过 ${MAX_AMOUNT.toLocaleString()}，当前输入为 ${paidNum.toLocaleString()}`)
      return
    }
    if (paidNum > Number(planAmount)) {
      alert(`实付金额 ¥${formatMoney(paidNum)} 超过应付金额 ¥${formatMoney(planAmount)}\n请修正金额或使用合同抵扣功能处理超额部分`)
      return
    }
    try {
      await axios.put(`/api/payments/${id}/pay`, {
        paidAmount: paidNum,
        paidDate: new Date(),
        paymentMethod: '银行转账'
      })
      fetchPlans()
    } catch (e) {
      alert(e.response?.data?.message || '操作失败，请稍后重试')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除此付款计划？删除后将重新计算合同已执行金额')) return
    try {
      await axios.delete(`/api/payments/${id}`)
      fetchPlans()
    } catch (e) {
      alert(e.response?.data?.message || '删除失败')
    }
  }

  const totalPlanned = plans.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalPaid = plans.reduce((s, p) => s + Number(p.paidAmount || 0), 0)
  const overPlanned = amount && totalPlanned > Number(amount)
  const remainingPlanned = amount ? Math.max(0, Number(amount) - totalPlanned) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-600 flex items-center flex-wrap gap-x-4 gap-y-1">
          <span>
            计划付款: <span className={`font-semibold ${overPlanned ? 'text-danger-600' : ''}`}>¥{formatMoney(totalPlanned)}</span>
            <span className="mx-1">/ 合同金额 ¥{formatMoney(amount)}</span>
          </span>
          {overPlanned && (
            <span className="inline-flex items-center gap-1 text-xs text-danger-700 bg-danger-50 px-2 py-0.5 rounded">
              <AlertTriangle size={12} /> 计划总额已超过合同金额，超出 ¥{formatMoney(totalPlanned - Number(amount))}
            </span>
          )}
          {!overPlanned && amount && remainingPlanned > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
              <Clock size={12} /> 剩余可计划 ¥{formatMoney(remainingPlanned)}
            </span>
          )}
          <span>已付: <span className="font-semibold text-success-600">¥{formatMoney(totalPaid)}</span></span>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setAddError(''); setAddFieldErrors({}) }} className="btn-primary text-sm">
          <Plus size={14} />
          添加节点
        </button>
      </div>

      {showAdd && (
        <div className="card bg-gray-50 space-y-3">
          {addError && (
            <div className="text-sm text-danger-700 bg-danger-50 rounded p-2.5 flex items-start gap-2 border border-danger-200">
              <Ban size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium mb-0.5">新增失败</div>
                <div className="text-xs">{addError}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">节点名称 *</label>
              <input
                placeholder="节点名称"
                className={`form-input text-sm ${addFieldErrors.nodeName ? 'border-danger-400 bg-danger-50/50' : ''}`}
                value={newPlan.nodeName}
                onChange={e => setNewPlan({ ...newPlan, nodeName: e.target.value })}
              />
              {addFieldErrors.nodeName && (
                <div className="text-xs text-danger-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} />{addFieldErrors.nodeName}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">金额(元) *</label>
              <input
                placeholder="0.00"
                type="text"
                className={`form-input text-sm font-mono ${addFieldErrors.amount ? 'border-danger-400 bg-danger-50/50' : ''}`}
                value={newPlan.amount}
                onChange={e => setNewPlan({ ...newPlan, amount: e.target.value })}
              />
              {addFieldErrors.amount && (
                <div className="text-xs text-danger-600 mt-1 flex items-start gap-1">
                  <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                  <span>{addFieldErrors.amount}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">应付日期 *</label>
              <input
                type="date"
                className={`form-input text-sm ${addFieldErrors.dueDate ? 'border-danger-400 bg-danger-50/50' : ''}`}
                value={newPlan.dueDate}
                onChange={e => setNewPlan({ ...newPlan, dueDate: e.target.value })}
              />
              {addFieldErrors.dueDate && (
                <div className="text-xs text-danger-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} />{addFieldErrors.dueDate}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 mb-1 block">付款条件</label>
              <div className="flex gap-2 h-[38px]">
                <input
                  placeholder="条件说明"
                  className="form-input text-sm flex-1"
                  value={newPlan.condition}
                  onChange={e => setNewPlan({ ...newPlan, condition: e.target.value })}
                />
                <button onClick={handleAdd} className="btn-primary whitespace-nowrap h-full">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.length === 0 && (
          <div className="card text-center py-8 text-gray-400 text-sm">
            <Clock size={32} className="mx-auto mb-2 opacity-40" />
            暂无付款计划，点击「添加节点」创建
          </div>
        )}
        {plans.map((plan, idx) => {
          const isPaid = plan.status === '已付款'
          const overdue = !isPaid && plan.dueDate && new Date(plan.dueDate) < new Date()
          return (
            <div key={plan._id} className={`card flex items-start gap-4 ${isPaid ? 'bg-success-50/40' : overdue ? 'bg-warning-50/40' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-success-100' : overdue ? 'bg-warning-100' : 'bg-gray-100'}`}>
                {isPaid
                  ? <CheckCircle size={16} className="text-success-600" />
                  : overdue
                    ? <AlertCircle size={16} className="text-warning-600" />
                    : <Clock size={16} className="text-gray-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-sm">
                    节点 {idx + 1}：{plan.nodeName}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isPaid ? 'bg-success-100 text-success-700' : overdue ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isPaid ? '已付款' : overdue ? '已逾期' : '待付款'}
                  </span>
                  {!isPaid && <button onClick={() => handleDelete(plan._id)} className="ml-auto text-xs text-danger-600 hover:text-danger-700 flex items-center gap-1"><Trash2 size={12} />删除</button>}
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
                {!isPaid && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => handlePay(plan._id, plan.amount)} className="text-xs btn-primary">标记付款</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
