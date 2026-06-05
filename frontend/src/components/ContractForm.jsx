import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import moment from 'moment'

const contractTypes = ['采购', '销售', '劳务', '租赁']
const paymentMethods = ['一次性', '分期', '里程碑']

export default function ContractForm({ contract, onClose }) {
  const { createContract, updateContract } = useContracts()
  const [form, setForm] = useState({
    contractNo: '',
    name: '',
    type: '采购',
    partyA: { name: '', contact: '', address: '' },
    partyB: { name: '', contact: '', address: '' },
    amount: '',
    signDate: '',
    effectiveDate: '',
    expiryDate: '',
    paymentMethod: '一次性',
    relatedOrderNo: '',
    relatedProjectNo: '',
    remarks: ''
  })

  useEffect(() => {
    if (contract) {
      setForm({
        ...contract,
        signDate: contract.signDate ? moment(contract.signDate).format('YYYY-MM-DD') : '',
        effectiveDate: contract.effectiveDate ? moment(contract.effectiveDate).format('YYYY-MM-DD') : '',
        expiryDate: contract.expiryDate ? moment(contract.expiryDate).format('YYYY-MM-DD') : ''
      })
    }
  }, [contract])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      amount: Number(form.amount),
      signDate: new Date(form.signDate),
      effectiveDate: new Date(form.effectiveDate),
      expiryDate: new Date(form.expiryDate)
    }
    if (contract) {
      await updateContract(contract._id, payload)
    } else {
      await createContract(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{contract ? '编辑合同' : '新增合同'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">合同编号 *</label>
              <input required className="form-input" value={form.contractNo} onChange={e => setForm({ ...form, contractNo: e.target.value })} />
            </div>
            <div>
              <label className="form-label">合同名称 *</label>
              <input required className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">合同类型 *</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">合同金额 *</label>
              <input required type="number" min="0" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="form-label">签订日期 *</label>
              <input required type="date" className="form-input" value={form.signDate} onChange={e => setForm({ ...form, signDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">生效日期 *</label>
              <input required type="date" className="form-input" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">到期日期 *</label>
              <input required type="date" className="form-input" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">付款方式 *</label>
              <select className="form-input" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                {paymentMethods.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">甲方信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">名称 *</label>
                <input required className="form-input" value={form.partyA.name} onChange={e => setForm({ ...form, partyA: { ...form.partyA, name: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">联系人</label>
                <input className="form-input" value={form.partyA.contact} onChange={e => setForm({ ...form, partyA: { ...form.partyA, contact: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">地址</label>
                <input className="form-input" value={form.partyA.address} onChange={e => setForm({ ...form, partyA: { ...form.partyA, address: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">乙方信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">名称 *</label>
                <input required className="form-input" value={form.partyB.name} onChange={e => setForm({ ...form, partyB: { ...form.partyB, name: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">联系人</label>
                <input className="form-input" value={form.partyB.contact} onChange={e => setForm({ ...form, partyB: { ...form.partyB, contact: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">地址</label>
                <input className="form-input" value={form.partyB.address} onChange={e => setForm({ ...form, partyB: { ...form.partyB, address: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">关联信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">关联订单编号</label>
                <input className="form-input" value={form.relatedOrderNo} onChange={e => setForm({ ...form, relatedOrderNo: e.target.value })} />
              </div>
              <div>
                <label className="form-label">关联项目编号</label>
                <input className="form-input" value={form.relatedProjectNo} onChange={e => setForm({ ...form, relatedProjectNo: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">备注</label>
            <textarea rows={3} className="form-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  )
}
