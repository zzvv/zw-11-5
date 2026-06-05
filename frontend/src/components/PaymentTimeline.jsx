import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'
import moment from 'moment'

export default function PaymentTimeline({ contractId, amount }) {
  const [plans, setPlans] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newPlan, setNewPlan] = useState({ nodeName: '', amount: '', dueDate: '', condition: '' })

  const fetchPlans = async () => {
    const res = await axios.get(`/api/payments/contract/${contractId}`)
    setPlans(res.data.data || [])
  }

  useEffect(() => { fetchPlans() }, [contractId])

  const handleAdd = async () => {
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
  }

  const handlePay = async (id) => {
    const paidAmount = prompt('请输入实际付款金额:')
    if (!paidAmount) return
    await axios.put(`/api/payments/${id}/pay`, {
      paidAmount: Number(paidAmount),
      paidDate: new Date(),
      paymentMethod: '银行转账'
    })
    fetchPlans()
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除此付款计划?')) return
    await axios.delete(`/api/payments/${id}`)
    fetchPlans()
  }

  const totalPlanned = plans.reduce((s, p) => s + p.amount, 0)
  const totalPaid = plans.reduce((s, p) => s + p.paidAmount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          计划付款: <span className="font-semibold">{totalPlanned.toLocaleString()}</span> 元 / 合同金额 {amount?.toLocaleString()} 元
          <span className="ml-4">已付: <span className="font-semibold text-success-600">{totalPaid.toLocaleString()}</span> 元</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
          <Plus size={14} />
          添加节点
        </button>
      </div>

      {showAdd && (
        <div className="card bg-gray-50 grid grid-cols-4 gap-3">
          <input placeholder="节点名称" className="form-input" value={newPlan.nodeName} onChange={e => setNewPlan({ ...newPlan, nodeName: e.target.value })} />
          <input placeholder="金额" type="number" className="form-input" value={newPlan.amount} onChange={e => setNewPlan({ ...newPlan, amount: e.target.value })} />
          <input type="date" className="form-input" value={newPlan.dueDate} onChange={e => setNewPlan({ ...newPlan, dueDate: e.target.value })} />
          <div className="flex gap-2">
            <input placeholder="付款条件" className="form-input" value={newPlan.condition} onChange={e => setNewPlan({ ...newPlan, condition: e.target.value })} />
            <button onClick={handleAdd} className="btn-primary whitespace-nowrap">保存</button>
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
                    {!isPaid && <button onClick={() => handlePay(plan._id)} className="text-xs btn-primary">标记付款</button>}
                    <button onClick={() => handleDelete(plan._id)} className="text-gray-400 hover:text-danger-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-3 gap-4">
                  <div>应付金额: <span className="font-semibold">{plan.amount.toLocaleString()}</span> 元</div>
                  <div>应付日期: {moment(plan.dueDate).format('YYYY-MM-DD')}</div>
                  <div>付款条件: {plan.condition || '-'}</div>
                  {isPaid && (
                    <>
                      <div>实付金额: <span className="font-semibold text-success-600">{plan.paidAmount.toLocaleString()}</span> 元</div>
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
