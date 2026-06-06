import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GitCompare, CheckCircle2, XCircle, AlertTriangle,
  CalendarDays, DollarSign, Users, FileSignature, Link2,
  ClipboardList, Loader2, AlertCircle, RefreshCw, Info
} from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import axios from 'axios'
import moment from 'moment'

const API_BASE = '/api'

const REQUIRED_FIELDS = [
  { key: 'amount', label: '合同金额', category: '金额' },
  { key: 'executedAmount', label: '已执行金额', category: '金额' },
  { key: 'remainingAmount', label: '剩余金额', category: '金额' },
  { key: 'signDate', label: '签订日期', category: '期限' },
  { key: 'effectiveDate', label: '生效日期', category: '期限' },
  { key: 'expiryDate', label: '到期日期', category: '期限' },
  { key: 'paymentMethod', label: '付款方式', category: '付款方式' },
  { key: 'partyA.name', label: '甲方名称', category: '甲方' },
  { key: 'partyA.contact', label: '甲方联系人', category: '甲方' },
  { key: 'partyA.address', label: '甲方地址', category: '甲方' },
  { key: 'partyB.name', label: '乙方名称', category: '乙方' },
  { key: 'partyB.contact', label: '乙方联系人', category: '乙方' },
  { key: 'partyB.address', label: '乙方地址', category: '乙方' },
  { key: 'relatedOrderNo', label: '关联订单号', category: '关联编号' },
  { key: 'relatedProjectNo', label: '关联项目号', category: '关联编号' },
]

const getNestedValue = (obj, path) => {
  if (!obj) return undefined
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined
    return acc[key]
  }, obj)
}

const isFieldMissing = (contract, fieldKey) => {
  const val = getNestedValue(contract, fieldKey)
  if (val === undefined || val === null) return true
  if (typeof val === 'string' && val.trim() === '') return true
  return false
}

export default function ContractCompare() {
  const navigate = useNavigate()
  const { contracts } = useContracts()
  const [contractAId, setContractAId] = useState('')
  const [contractBId, setContractBId] = useState('')
  const [contractA, setContractA] = useState(null)
  const [contractB, setContractB] = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [errorA, setErrorA] = useState(null)
  const [errorB, setErrorB] = useState(null)

  const fetchContractDetail = useCallback(async (id, setContract, setLoading, setError) => {
    if (!id) {
      setContract(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_BASE}/contracts/${id}`)
      if (res.data && res.data.success && res.data.data) {
        setContract(res.data.data)
      } else {
        setError('返回数据格式异常')
        setContract(null)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || '加载失败')
      setContract(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContractDetail(contractAId, setContractA, setLoadingA, setErrorA)
  }, [contractAId, fetchContractDetail])

  useEffect(() => {
    fetchContractDetail(contractBId, setContractB, setLoadingB, setErrorB)
  }, [contractBId, fetchContractDetail])

  const isDifferent = (valA, valB) => {
    const aEmpty = valA === undefined || valA === null || (typeof valA === 'string' && valA.trim() === '')
    const bEmpty = valB === undefined || valB === null || (typeof valB === 'string' && valB.trim() === '')
    if (aEmpty && bEmpty) return false
    if (aEmpty || bEmpty) return true
    return JSON.stringify(valA) !== JSON.stringify(valB)
  }

  const formatDate = (date) => date ? moment(date).format('YYYY-MM-DD') : null
  const formatMoney = (amount) => (amount !== undefined && amount !== null && amount !== '') ? `¥${Number(amount).toLocaleString()}` : null

  const missingFieldsA = useMemo(() => {
    if (!contractA) return []
    return REQUIRED_FIELDS.filter(f => isFieldMissing(contractA, f.key))
  }, [contractA])

  const missingFieldsB = useMemo(() => {
    if (!contractB) return []
    return REQUIRED_FIELDS.filter(f => isFieldMissing(contractB, f.key))
  }, [contractB])

  const diffStats = useMemo(() => {
    if (!contractA || !contractB) return { total: 0, diff: 0, same: 0, missingA: 0, missingB: 0 }
    let diffCount = 0
    let sameCount = 0
    let missA = 0
    let missB = 0
    REQUIRED_FIELDS.forEach(f => {
      const valA = getNestedValue(contractA, f.key)
      const valB = getNestedValue(contractB, f.key)
      const missAField = isFieldMissing(contractA, f.key)
      const missBField = isFieldMissing(contractB, f.key)
      if (missAField) missA++
      if (missBField) missB++
      if (isDifferent(valA, valB)) diffCount++
      else sameCount++
    })
    return { total: REQUIRED_FIELDS.length, diff: diffCount, same: sameCount, missingA: missA, missingB: missB }
  }, [contractA, contractB])

  const DiffCell = ({ label, icon: Icon, valueA, valueB, subA, subB, missingA = false, missingB = false }) => {
    const diff = isDifferent(valueA, valueB)
    const hasMissing = missingA || missingB
    const displayA = missingA ? (
      <span className="inline-flex items-center gap-1 text-danger-600 bg-danger-50 px-2 py-0.5 rounded text-xs font-medium">
        <AlertCircle size={10} /> 字段缺失
      </span>
    ) : (valueA !== undefined && valueA !== null && valueA !== '' ? valueA : '-')
    const displayB = missingB ? (
      <span className="inline-flex items-center gap-1 text-danger-600 bg-danger-50 px-2 py-0.5 rounded text-xs font-medium">
        <AlertCircle size={10} /> 字段缺失
      </span>
    ) : (valueB !== undefined && valueB !== null && valueB !== '' ? valueB : '-')

    return (
      <div className={`grid grid-cols-12 gap-4 py-4 border-b border-gray-100 ${diff ? 'bg-warning-50' : ''} ${hasMissing && !diff ? 'bg-danger-50/40' : ''}`}>
        <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-gray-600 flex-wrap">
          {Icon && <Icon size={16} className="text-gray-400" />}
          <span>{label}</span>
          {diff && (
            <span className="flex items-center gap-0.5 text-xs text-warning-700 bg-warning-100 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} /> 差异
            </span>
          )}
          {hasMissing && (
            <span className="flex items-center gap-0.5 text-xs text-danger-700 bg-danger-100 px-1.5 py-0.5 rounded">
              <AlertCircle size={10} /> 数据不完整
            </span>
          )}
        </div>
        <div className={`col-span-5 ${diff ? 'bg-warning-100 rounded-lg p-3 -my-1' : ''} ${missingA && !diff ? 'bg-danger-50 rounded-lg p-3 -my-1' : ''}`}>
          <div className={`text-sm ${diff || missingA ? 'font-semibold' : 'text-gray-700'} ${missingA ? 'text-danger-700' : ''}`}>
            {displayA}
          </div>
          {subA && !missingA && <div className="text-xs text-gray-500 mt-1">{subA}</div>}
        </div>
        <div className={`col-span-5 ${diff ? 'bg-warning-100 rounded-lg p-3 -my-1' : ''} ${missingB && !diff ? 'bg-danger-50 rounded-lg p-3 -my-1' : ''}`}>
          <div className={`text-sm ${diff || missingB ? 'font-semibold' : 'text-gray-700'} ${missingB ? 'text-danger-700' : ''}`}>
            {displayB}
          </div>
          {subB && !missingB && <div className="text-xs text-gray-500 mt-1">{subB}</div>}
        </div>
      </div>
    )
  }

  const ContractSelectorCard = ({
    title, contractId, setContractId, otherId,
    contract, loading, error, missingFields, color
  }) => (
    <div className={`card ${error ? 'border-danger-200' : ''}`}>
      <label className="form-label flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        {title}
      </label>
      <select
        className="form-input"
        value={contractId}
        onChange={(e) => setContractId(e.target.value)}
        disabled={loading}
      >
        <option value="">-- 请选择 --</option>
        {contracts.filter(c => c._id !== otherId).map(c => (
          <option key={c._id} value={c._id}>{c.contractNo} - {c.name}</option>
        ))}
      </select>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          正在加载合同详情...
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-danger-700 bg-danger-50 rounded-lg p-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">加载失败：{error}</div>
            <button
              onClick={() => fetchContractDetail(contractId,
                title.includes('A') ? setContractA : setContractB,
                title.includes('A') ? setLoadingA : setLoadingB,
                title.includes('A') ? setErrorA : setErrorB
              )}
              className="mt-1 inline-flex items-center gap-1 text-xs text-danger-700 underline hover:text-danger-800"
            >
              <RefreshCw size={12} /> 重试
            </button>
          </div>
        </div>
      )}

      {contract && !loading && !error && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-800">{contract.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">编号：{contract.contractNo}</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{contract.type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">{contract.status}</span>
            </div>
          </div>
          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-danger-700 bg-danger-50 rounded-lg p-2.5">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium mb-1">数据完整性警告：缺失 {missingFields.length} 个字段</div>
                <div className="flex flex-wrap gap-1">
                  {missingFields.slice(0, 5).map(f => (
                    <span key={f.key} className="bg-white px-1.5 py-0.5 rounded border border-danger-200">
                      {f.label}
                    </span>
                  ))}
                  {missingFields.length > 5 && (
                    <span className="text-danger-600">+{missingFields.length - 5} 更多</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {missingFields.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-success-700">
              <CheckCircle2 size={14} />
              所有对比字段数据完整
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare size={24} className="text-primary-600" />
            合同对比视图
          </h1>
          <p className="text-sm text-gray-500 mt-1">选择两份合同进行并排对比，系统将从合同详情接口获取完整数据</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ContractSelectorCard
          title="选择合同 A"
          contractId={contractAId}
          setContractId={setContractAId}
          otherId={contractBId}
          contract={contractA}
          loading={loadingA}
          error={errorA}
          missingFields={missingFieldsA}
          color="bg-primary-500"
        />
        <ContractSelectorCard
          title="选择合同 B"
          contractId={contractBId}
          setContractId={setContractBId}
          otherId={contractAId}
          contract={contractB}
          loading={loadingB}
          error={errorB}
          missingFields={missingFieldsB}
          color="bg-success-500"
        />
      </div>

      {(!contractA || !contractB || loadingA || loadingB) ? (
        <div className="card text-center py-16">
          {loadingA || loadingB ? (
            <>
              <Loader2 size={48} className="mx-auto text-primary-500 mb-4 animate-spin" />
              <div className="text-gray-500">正在加载合同详情数据...</div>
            </>
          ) : (
            <>
              <GitCompare size={48} className="mx-auto text-gray-300 mb-4" />
              <div className="text-gray-500">请选择两份合同开始对比</div>
              <div className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                <Info size={12} />
                对比数据均来自合同详情接口，涵盖金额、期限、付款方式、甲乙双方信息和关联编号
              </div>
            </>
          )}
        </div>
      ) : errorA || errorB ? (
        <div className="card bg-danger-50 border-danger-200 text-center py-12">
          <AlertCircle size={48} className="mx-auto text-danger-500 mb-4" />
          <div className="text-danger-700 font-medium">部分合同数据加载失败，请检查网络后重试</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            <div className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <ClipboardList size={20} className="text-gray-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">对比字段</div>
                <div className="text-xl font-bold">{diffStats.total}</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-success-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">一致字段</div>
                <div className="text-xl font-bold text-success-600">{diffStats.same}</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diffStats.diff > 0 ? 'bg-warning-100' : 'bg-gray-100'}`}>
                <XCircle size={20} className={diffStats.diff > 0 ? 'text-warning-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="text-xs text-gray-500">差异字段</div>
                <div className={`text-xl font-bold ${diffStats.diff > 0 ? 'text-warning-600' : 'text-gray-400'}`}>{diffStats.diff}</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diffStats.missingA > 0 ? 'bg-danger-100' : 'bg-gray-100'}`}>
                <AlertCircle size={20} className={diffStats.missingA > 0 ? 'text-danger-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="text-xs text-gray-500">A 缺失字段</div>
                <div className={`text-xl font-bold ${diffStats.missingA > 0 ? 'text-danger-600' : 'text-gray-400'}`}>{diffStats.missingA}</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diffStats.missingB > 0 ? 'bg-danger-100' : 'bg-gray-100'}`}>
                <AlertCircle size={20} className={diffStats.missingB > 0 ? 'text-danger-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="text-xs text-gray-500">B 缺失字段</div>
                <div className={`text-xl font-bold ${diffStats.missingB > 0 ? 'text-danger-600' : 'text-gray-400'}`}>{diffStats.missingB}</div>
              </div>
            </div>
          </div>

          {(missingFieldsA.length > 0 || missingFieldsB.length > 0) && (
            <div className="card bg-danger-50 border-danger-200">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-danger-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-danger-800 flex-1">
                  <div className="font-semibold mb-2">数据完整性警告</div>
                  <div className="space-y-2">
                    {missingFieldsA.length > 0 && (
                      <div>
                        <span className="font-medium">合同 A ({contractA?.contractNo}) 缺失 {missingFieldsA.length} 个字段：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {missingFieldsA.map(f => (
                            <span key={`a-${f.key}`} className="bg-white px-2 py-0.5 rounded border border-danger-300 text-xs">
                              [{f.category}] {f.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {missingFieldsB.length > 0 && (
                      <div>
                        <span className="font-medium">合同 B ({contractB?.contractNo}) 缺失 {missingFieldsB.length} 个字段：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {missingFieldsB.map(f => (
                            <span key={`b-${f.key}`} className="bg-white px-2 py-0.5 rounded border border-danger-300 text-xs">
                              [{f.category}] {f.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-danger-600 mt-2 flex items-center gap-1">
                      <Info size={12} />
                      建议补全缺失字段后再进行对比分析，或谨慎解读对比结果
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
              <div className="col-span-2">对比项</div>
              <div className="col-span-5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  合同 A：{contractA.contractNo}
                </span>
              </div>
              <div className="col-span-5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success-500"></span>
                  合同 B：{contractB.contractNo}
                </span>
              </div>
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <DollarSign size={14} className="inline mr-1" /> 金额信息
              </div>
              <DiffCell
                label="合同金额"
                icon={DollarSign}
                valueA={formatMoney(contractA.amount)}
                valueB={formatMoney(contractB.amount)}
                subA={!isFieldMissing(contractA, 'amount') && contractA.executionPercent !== undefined ? `已执行 ${contractA.executionPercent}%` : ''}
                subB={!isFieldMissing(contractB, 'amount') && contractB.executionPercent !== undefined ? `已执行 ${contractB.executionPercent}%` : ''}
                missingA={isFieldMissing(contractA, 'amount')}
                missingB={isFieldMissing(contractB, 'amount')}
              />
              <DiffCell
                label="已执行金额"
                valueA={formatMoney(contractA.executedAmount)}
                valueB={formatMoney(contractB.executedAmount)}
                missingA={isFieldMissing(contractA, 'executedAmount')}
                missingB={isFieldMissing(contractB, 'executedAmount')}
              />
              <DiffCell
                label="剩余金额"
                valueA={formatMoney(contractA.remainingAmount)}
                valueB={formatMoney(contractB.remainingAmount)}
                missingA={isFieldMissing(contractA, 'remainingAmount')}
                missingB={isFieldMissing(contractB, 'remainingAmount')}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <CalendarDays size={14} className="inline mr-1" /> 期限信息
              </div>
              <DiffCell
                label="签订日期"
                icon={CalendarDays}
                valueA={formatDate(contractA.signDate)}
                valueB={formatDate(contractB.signDate)}
                missingA={isFieldMissing(contractA, 'signDate')}
                missingB={isFieldMissing(contractB, 'signDate')}
              />
              <DiffCell
                label="生效日期"
                valueA={formatDate(contractA.effectiveDate)}
                valueB={formatDate(contractB.effectiveDate)}
                missingA={isFieldMissing(contractA, 'effectiveDate')}
                missingB={isFieldMissing(contractB, 'effectiveDate')}
              />
              <DiffCell
                label="到期日期"
                valueA={formatDate(contractA.expiryDate)}
                valueB={formatDate(contractB.expiryDate)}
                subA={!isFieldMissing(contractA, 'expiryDate') ? `${moment(contractA.expiryDate).diff(moment(), 'days')} 天后到期` : ''}
                subB={!isFieldMissing(contractB, 'expiryDate') ? `${moment(contractB.expiryDate).diff(moment(), 'days')} 天后到期` : ''}
                missingA={isFieldMissing(contractA, 'expiryDate')}
                missingB={isFieldMissing(contractB, 'expiryDate')}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <FileSignature size={14} className="inline mr-1" /> 付款方式
              </div>
              <DiffCell
                label="付款方式"
                icon={FileSignature}
                valueA={contractA.paymentMethod}
                valueB={contractB.paymentMethod}
                missingA={isFieldMissing(contractA, 'paymentMethod')}
                missingB={isFieldMissing(contractB, 'paymentMethod')}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <Users size={14} className="inline mr-1" /> 甲方信息
              </div>
              <DiffCell
                label="甲方名称"
                icon={Users}
                valueA={contractA.partyA?.name}
                valueB={contractB.partyA?.name}
                missingA={isFieldMissing(contractA, 'partyA.name')}
                missingB={isFieldMissing(contractB, 'partyA.name')}
              />
              <DiffCell
                label="甲方联系人"
                valueA={contractA.partyA?.contact}
                valueB={contractB.partyA?.contact}
                missingA={isFieldMissing(contractA, 'partyA.contact')}
                missingB={isFieldMissing(contractB, 'partyA.contact')}
              />
              <DiffCell
                label="甲方地址"
                valueA={contractA.partyA?.address}
                valueB={contractB.partyA?.address}
                missingA={isFieldMissing(contractA, 'partyA.address')}
                missingB={isFieldMissing(contractB, 'partyA.address')}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <Users size={14} className="inline mr-1" /> 乙方信息
              </div>
              <DiffCell
                label="乙方名称"
                icon={Users}
                valueA={contractA.partyB?.name}
                valueB={contractB.partyB?.name}
                missingA={isFieldMissing(contractA, 'partyB.name')}
                missingB={isFieldMissing(contractB, 'partyB.name')}
              />
              <DiffCell
                label="乙方联系人"
                valueA={contractA.partyB?.contact}
                valueB={contractB.partyB?.contact}
                missingA={isFieldMissing(contractA, 'partyB.contact')}
                missingB={isFieldMissing(contractB, 'partyB.contact')}
              />
              <DiffCell
                label="乙方地址"
                valueA={contractA.partyB?.address}
                valueB={contractB.partyB?.address}
                missingA={isFieldMissing(contractA, 'partyB.address')}
                missingB={isFieldMissing(contractB, 'partyB.address')}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <Link2 size={14} className="inline mr-1" /> 关联编号
              </div>
              <DiffCell
                label="关联订单号"
                icon={Link2}
                valueA={contractA.relatedOrderNo}
                valueB={contractB.relatedOrderNo}
                missingA={isFieldMissing(contractA, 'relatedOrderNo')}
                missingB={isFieldMissing(contractB, 'relatedOrderNo')}
              />
              <DiffCell
                label="关联项目号"
                valueA={contractA.relatedProjectNo}
                valueB={contractB.relatedProjectNo}
                missingA={isFieldMissing(contractA, 'relatedProjectNo')}
                missingB={isFieldMissing(contractB, 'relatedProjectNo')}
              />
            </div>
          </div>

          <div className="card bg-blue-50 border-blue-100">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-1">商务复盘提示</div>
                <p className="text-blue-700">
                  {diffStats.missingA > 0 || diffStats.missingB > 0
                    ? `检测到 ${diffStats.missingA + diffStats.missingB} 处字段缺失，对比结果仅供参考。建议先补全合同数据后再进行严谨对比。${diffStats.diff > 0 ? `当前已识别 ${diffStats.diff} 处条款差异。` : ''}`
                    : diffStats.diff === 0
                      ? '两份合同在全部 15 个关键条款上完全一致，可作为标准化模板参考。'
                      : `识别到 ${diffStats.diff} 处差异，请重点关注黄色高亮标记的条款，建议在谈判前准备好差异说明和应对策略。`
                  }
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
