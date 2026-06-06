import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, AlertTriangle, CheckCircle2, Calculator, Percent, Tag, Receipt, Wallet, AlertCircle, Ban } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import axios from 'axios'
import moment from 'moment'

const API_BASE = '/api'
const MAX_AMOUNT = 999999999.99

const contractTypes = ['采购', '销售', '劳务', '租赁']
const paymentMethods = ['一次性', '分期', '里程碑']

const roundTo2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const formatMoney = (n) => (n === undefined || n === null || isNaN(n)) ? '-' : `¥${Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const FIELD_LABELS = {
  amount: '合同金额',
  discountAmount: '优惠金额',
  discountPercent: '优惠比例',
  billedAmount: '已计费金额',
  deductibleAmount: '抵扣金额',
  executedAmount: '已执行/实付金额'
}

export default function ContractForm({ contract, onClose }) {
  const { createContract, updateContract } = useContracts()
  const [form, setForm] = useState({
    contractNo: '',
    name: '',
    type: '采购',
    partyA: { name: '', contact: '', address: '' },
    partyB: { name: '', contact: '', address: '' },
    amount: '',
    discountAmount: '',
    discountPercent: '',
    billedAmount: '',
    deductibleAmount: '',
    executedAmount: '',
    signDate: '',
    effectiveDate: '',
    expiryDate: '',
    paymentMethod: '一次性',
    relatedOrderNo: '',
    relatedProjectNo: '',
    remarks: ''
  })
  const [errors, setErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [warnings, setWarnings] = useState([])
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (contract) {
      setForm({
        ...contract,
        amount: contract.amount ?? '',
        discountAmount: contract.discountAmount ?? '',
        discountPercent: contract.discountPercent ?? '',
        billedAmount: contract.billedAmount ?? '',
        deductibleAmount: contract.deductibleAmount ?? '',
        executedAmount: contract.executedAmount ?? '',
        signDate: contract.signDate ? moment(contract.signDate).format('YYYY-MM-DD') : '',
        effectiveDate: contract.effectiveDate ? moment(contract.effectiveDate).format('YYYY-MM-DD') : '',
        expiryDate: contract.expiryDate ? moment(contract.expiryDate).format('YYYY-MM-DD') : ''
      })
    }
  }, [contract])

  const validateLocal = useCallback(() => {
    const errs = {}
    const amtVal = form.amount
    const amount = Number(amtVal)
    if (amtVal === '' || amtVal === undefined || amtVal === null) {
      errs.amount = '请填写合同金额'
    } else if (isNaN(amount) || !isFinite(amount)) {
      errs.amount = `「${amtVal}」不是有效数字，请输入合法的数字`
    } else if (amount < 0) {
      errs.amount = `合同金额不能小于 0，当前输入为 ${amount}`
    } else if (amount > MAX_AMOUNT) {
      errs.amount = `合同金额不能大于 ${MAX_AMOUNT.toLocaleString()}，当前输入为 ${amount.toLocaleString()}`
    }

    const checkNumberField = (fieldKey, label, { max = MAX_AMOUNT, min = 0, upperBoundFn = null } = {}) => {
      const rawVal = form[fieldKey]
      if (rawVal === '' || rawVal === undefined || rawVal === null) return
      const num = Number(rawVal)
      if (isNaN(num) || !isFinite(num)) {
        errs[fieldKey] = `「${rawVal}」不是有效数字，请输入合法的数字`
        return
      }
      if (num < min) {
        errs[fieldKey] = `${label}不能小于 ${min}，当前输入为 ${num}`
        return
      }
      if (num > max) {
        errs[fieldKey] = `${label}不能大于 ${max.toLocaleString()}，当前输入为 ${num.toLocaleString()}`
        return
      }
      if (upperBoundFn) {
        const { upper, upperLabel } = upperBoundFn()
        if (upper !== null && num > upper) {
          errs[fieldKey] = `${label}不能超过${upperLabel} ${upper.toLocaleString()}，当前输入为 ${num.toLocaleString()}`
        }
      }
    }

    checkNumberField('discountAmount', '优惠金额', {
      upperBoundFn: () => (!isNaN(amount) && isFinite(amount) && amount > 0
        ? { upper: amount, upperLabel: '合同金额' }
        : { upper: null })
    })
    checkNumberField('discountPercent', '优惠比例', { max: 100, min: 0 })
    checkNumberField('billedAmount', '已计费金额')
    checkNumberField('deductibleAmount', '抵扣金额', {
      upperBoundFn: () => {
        const billed = Number(form.billedAmount)
        return (!isNaN(billed) && isFinite(billed) && billed > 0
          ? { upper: billed, upperLabel: `已计费金额 (${billed.toLocaleString()})` }
          : { upper: null })
      }
    })
    checkNumberField('executedAmount', '已执行/实付金额')

    if (!form.contractNo?.trim()) errs.contractNo = '请输入合同编号'
    if (!form.name?.trim()) errs.name = '请输入合同名称'
    if (!form.partyA?.name?.trim()) errs['partyA.name'] = '请输入甲方名称'
    if (!form.partyB?.name?.trim()) errs['partyB.name'] = '请输入乙方名称'
    if (!form.signDate) errs.signDate = '请选择签订日期'
    if (!form.effectiveDate) errs.effectiveDate = '请选择生效日期'
    if (!form.expiryDate) errs.expiryDate = '请选择到期日期'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  useEffect(() => { validateLocal() }, [validateLocal])

  useEffect(() => {
    const payload = {
      amount: form.amount,
      discountAmount: form.discountAmount,
      discountPercent: form.discountPercent,
      billedAmount: form.billedAmount,
      deductibleAmount: form.deductibleAmount,
      executedAmount: form.executedAmount
    }
    const hasAny = Object.values(payload).some(v => v !== '' && v !== undefined && v !== null)
    if (!hasAny) {
      setPreview(null)
      setFieldErrors({})
      setWarnings([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.post(`${API_BASE}/contracts/amount-preview`, payload)
        if (res.data?.success) {
          setPreview(res.data.data)
          setWarnings(res.data.warnings || [])
          const fErrs = {}
          const rawErrs = res.data.errors || []
          rawErrs.forEach(errMsg => {
            Object.keys(FIELD_LABELS).forEach(key => {
              if (errMsg.includes(FIELD_LABELS[key]) && !fErrs[key]) {
                fErrs[key] = errMsg
              }
            })
          })
          setFieldErrors(fErrs)
        }
      } catch (e) {
        const amount = form.amount === '' || isNaN(Number(form.amount)) ? 0 : Number(form.amount)
        const dAmount = form.discountAmount === '' || isNaN(Number(form.discountAmount)) ? 0 : Number(form.discountAmount)
        const dPercent = form.discountPercent === '' || isNaN(Number(form.discountPercent)) ? 0 : Math.max(0, Math.min(100, Number(form.discountPercent)))
        const billed = form.billedAmount === '' || isNaN(Number(form.billedAmount)) ? 0 : Number(form.billedAmount)
        const deductible = form.deductibleAmount === '' || isNaN(Number(form.deductibleAmount)) ? 0 : Number(form.deductibleAmount)
        let computedDiscount = dAmount
        if (dPercent > 0 && (form.discountAmount === '' || Number(form.discountAmount) <= 0 || isNaN(Number(form.discountAmount)))) {
          computedDiscount = roundTo2(amount * dPercent / 100)
        }
        if (computedDiscount > amount) computedDiscount = amount
        const finalPayable = Math.max(0, roundTo2(amount - computedDiscount))
        const executed = form.executedAmount === '' || isNaN(Number(form.executedAmount)) ? 0 : Math.max(0, Math.min(finalPayable, Number(form.executedAmount)))
        setPreview({
          amount,
          discountAmount: Math.min(dAmount, amount),
          discountPercent: dPercent,
          billedAmount: billed,
          deductibleAmount: Math.min(deductible, billed > 0 ? billed : deductible),
          executedAmount: executed,
          finalPayableAmount: finalPayable,
          remainingAmount: Math.max(0, roundTo2(finalPayable - executed)),
          netPayableAmount: Math.max(0, roundTo2(Math.max(0, billed - deductible) - executed)),
          executionPercent: finalPayable > 0 ? roundTo2(executed / finalPayable * 100) : 0
        })
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [form.amount, form.discountAmount, form.discountPercent, form.billedAmount, form.deductibleAmount, form.executedAmount])

  const allErrors = useMemo(() => {
    const merged = { ...errors }
    Object.keys(fieldErrors).forEach(k => {
      if (!merged[k]) merged[k] = fieldErrors[k]
    })
    return merged
  }, [errors, fieldErrors])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validateLocal()) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? 0 : Number(form.amount),
        discountAmount: form.discountAmount === '' ? 0 : Number(form.discountAmount),
        discountPercent: form.discountPercent === '' ? 0 : Number(form.discountPercent),
        billedAmount: form.billedAmount === '' ? 0 : Number(form.billedAmount),
        deductibleAmount: form.deductibleAmount === '' ? 0 : Number(form.deductibleAmount),
        executedAmount: form.executedAmount === '' ? 0 : Number(form.executedAmount),
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
    } catch (e) {
      const msg = e.response?.data?.message || '保存失败，请检查输入'
      setSubmitError(msg)
      const backendErrors = e.response?.data?.errors || []
      if (backendErrors.length > 0) {
        const fErrs = {}
        backendErrors.forEach(errMsg => {
          Object.keys(FIELD_LABELS).forEach(key => {
            if (errMsg.includes(FIELD_LABELS[key]) && !fErrs[key]) {
              fErrs[key] = errMsg
            }
          })
        })
        setFieldErrors(prev => ({ ...prev, ...fErrs }))
        setWarnings(prev => [...new Set([...(prev || []), ...(e.response?.data?.warnings || [])])])
      }
    } finally {
      setSubmitting(false)
    }
  }

  const setField = (key, value) => {
    if (key.includes('.')) {
      const [group, field] = key.split('.')
      setForm(prev => ({ ...prev, [group]: { ...prev[group], [field]: value } }))
    } else {
      setForm(prev => ({ ...prev, [key]: value }))
    }
  }

  const FieldError = ({ field }) => allErrors[field] ? (
    <div className="text-xs text-danger-700 mt-1 flex items-start gap-1 bg-danger-50 p-1.5 rounded">
      <Ban size={12} className="flex-shrink-0 mt-0.5" />
      <span>{allErrors[field]}</span>
    </div>
  ) : null

  const hasAnyAmountError = Object.keys(allErrors).some(k => FIELD_LABELS[k])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">{contract ? '编辑合同' : '新增合同'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {submitError && (
          <div className="mx-6 mt-4 bg-danger-50 border border-danger-200 rounded-lg p-3 text-sm text-danger-800">
            <div className="font-semibold mb-1 flex items-center gap-1">
              <AlertCircle size={14} /> 提交失败
            </div>
            <div>{submitError}</div>
          </div>
        )}

        {(warnings.length > 0 || hasAnyAmountError) && (
          <div className="mx-6 mt-4 space-y-2">
            {hasAnyAmountError && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-sm text-danger-800">
                <div className="font-semibold mb-1.5 flex items-center gap-1">
                  <AlertCircle size={14} /> 金额字段存在错误（请修正后再提交）
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {Object.keys(FIELD_LABELS).filter(k => allErrors[k]).map(k => (
                    <li key={k}>{allErrors[k]}</li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-800">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <AlertTriangle size={14} /> 金额校验提示
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">合同编号 *</label>
              <input required className={`form-input ${allErrors.contractNo ? 'border-danger-400 bg-danger-50/30' : ''}`}
                value={form.contractNo} onChange={e => setField('contractNo', e.target.value)} />
              <FieldError field="contractNo" />
            </div>
            <div>
              <label className="form-label">合同名称 *</label>
              <input required className={`form-input ${allErrors.name ? 'border-danger-400 bg-danger-50/30' : ''}`}
                value={form.name} onChange={e => setField('name', e.target.value)} />
              <FieldError field="name" />
            </div>
            <div>
              <label className="form-label">合同类型 *</label>
              <select className="form-input" value={form.type} onChange={e => setField('type', e.target.value)}>
                {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">付款方式 *</label>
              <select className="form-input" value={form.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)}>
                {paymentMethods.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">签订日期 *</label>
              <input required type="date" className={`form-input ${allErrors.signDate ? 'border-danger-400 bg-danger-50/30' : ''}`}
                value={form.signDate} onChange={e => setField('signDate', e.target.value)} />
              <FieldError field="signDate" />
            </div>
            <div>
              <label className="form-label">生效日期 *</label>
              <input required type="date" className={`form-input ${allErrors.effectiveDate ? 'border-danger-400 bg-danger-50/30' : ''}`}
                value={form.effectiveDate} onChange={e => setField('effectiveDate', e.target.value)} />
              <FieldError field="effectiveDate" />
            </div>
            <div className="col-span-2">
              <label className="form-label">到期日期 *</label>
              <input required type="date" className={`form-input ${allErrors.expiryDate ? 'border-danger-400 bg-danger-50/30' : ''}`}
                value={form.expiryDate} onChange={e => setField('expiryDate', e.target.value)} />
              <FieldError field="expiryDate" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calculator size={16} className="text-primary-600" /> 金额与计费
              <span className="text-xs font-normal text-gray-400 ml-2">（所有金额字段请输入合法数字，系统将实时校验）</span>
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">合同金额(元) *</label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.amount ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.amount}
                  onChange={e => setField('amount', e.target.value)}
                  placeholder="例如 100000.00" />
                <FieldError field="amount" />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Tag size={12} />优惠金额(元)
                </label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.discountAmount ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.discountAmount}
                  onChange={e => setField('discountAmount', e.target.value)}
                  placeholder="留空表示 0" />
                <FieldError field="discountAmount" />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Percent size={12} />优惠比例(%)
                </label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.discountPercent ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.discountPercent}
                  onChange={e => setField('discountPercent', e.target.value)}
                  placeholder="0 ~ 100，留空表示 0" />
                <FieldError field="discountPercent" />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Receipt size={12} />已计费金额(元)
                </label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.billedAmount ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.billedAmount}
                  onChange={e => setField('billedAmount', e.target.value)}
                  placeholder="留空表示 0" />
                <FieldError field="billedAmount" />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Wallet size={12} />抵扣金额(元)
                </label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.deductibleAmount ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.deductibleAmount}
                  onChange={e => setField('deductibleAmount', e.target.value)}
                  placeholder="不能超过计费金额，留空表示 0" />
                <FieldError field="deductibleAmount" />
              </div>
              <div>
                <label className="form-label">已执行/实付金额(元)</label>
                <input type="text"
                  className={`form-input font-mono ${allErrors.executedAmount ? 'border-danger-400 bg-danger-50/50 focus:border-danger-500' : ''}`}
                  value={form.executedAmount}
                  onChange={e => setField('executedAmount', e.target.value)}
                  placeholder="留空表示 0" />
                <FieldError field="executedAmount" />
              </div>
            </div>

            {preview && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500">优惠后应付</div>
                  <div className="text-lg font-bold text-gray-900">{formatMoney(preview.finalPayableAmount)}</div>
                </div>
                <div className="bg-success-50 rounded-lg p-3 border border-success-100">
                  <div className="text-xs text-success-700">已执行金额</div>
                  <div className="text-lg font-bold text-success-700">{formatMoney(preview.executedAmount)}</div>
                </div>
                <div className="bg-warning-50 rounded-lg p-3 border border-warning-100">
                  <div className="text-xs text-warning-700">剩余应付</div>
                  <div className="text-lg font-bold text-warning-700">{formatMoney(preview.remainingAmount)}</div>
                </div>
                <div className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                  <div className="text-xs text-primary-700">净应付(计费-抵扣-已付)</div>
                  <div className="text-lg font-bold text-primary-700">{formatMoney(preview.netPayableAmount)}</div>
                </div>
                <div className="col-span-4 bg-blue-50 rounded-lg p-2.5 border border-blue-100 flex items-center gap-2 text-xs text-blue-800">
                  <CheckCircle2 size={14} />
                  <span>执行进度：<span className="font-bold">{preview.executionPercent}%</span></span>
                  {preview.discountAmount > 0 && <span className="ml-2">优惠金额：{formatMoney(preview.discountAmount)}</span>}
                  {preview.discountPercent > 0 && <span>（{preview.discountPercent}%）</span>}
                  {warnings.length === 0 && hasAnyAmountError && (
                    <span className="ml-auto text-danger-700 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> 仍有字段错误，请修正后再保存
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">甲方信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">名称 *</label>
                <input required className={`form-input ${allErrors['partyA.name'] ? 'border-danger-400 bg-danger-50/30' : ''}`}
                  value={form.partyA.name} onChange={e => setField('partyA.name', e.target.value)} />
                <FieldError field="partyA.name" />
              </div>
              <div>
                <label className="form-label">联系人</label>
                <input className="form-input" value={form.partyA.contact} onChange={e => setField('partyA.contact', e.target.value)} />
              </div>
              <div>
                <label className="form-label">地址</label>
                <input className="form-input" value={form.partyA.address} onChange={e => setField('partyA.address', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">乙方信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">名称 *</label>
                <input required className={`form-input ${allErrors['partyB.name'] ? 'border-danger-400 bg-danger-50/30' : ''}`}
                  value={form.partyB.name} onChange={e => setField('partyB.name', e.target.value)} />
                <FieldError field="partyB.name" />
              </div>
              <div>
                <label className="form-label">联系人</label>
                <input className="form-input" value={form.partyB.contact} onChange={e => setField('partyB.contact', e.target.value)} />
              </div>
              <div>
                <label className="form-label">地址</label>
                <input className="form-input" value={form.partyB.address} onChange={e => setField('partyB.address', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">关联信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">关联订单编号</label>
                <input className="form-input" value={form.relatedOrderNo} onChange={e => setField('relatedOrderNo', e.target.value)} />
              </div>
              <div>
                <label className="form-label">关联项目编号</label>
                <input className="form-input" value={form.relatedProjectNo} onChange={e => setField('relatedProjectNo', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">备注</label>
            <textarea rows={3} className="form-input" value={form.remarks} onChange={e => setField('remarks', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white -mx-6 px-6 pb-0">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>取消</button>
            <button type="submit" className="btn-primary" disabled={submitting || Object.keys(allErrors).length > 0}>
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
