import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GitCompare, CheckCircle2, XCircle, AlertTriangle, CalendarDays, DollarSign, Users, FileSignature, Link2, ClipboardList } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import moment from 'moment'

export default function ContractCompare() {
  const navigate = useNavigate()
  const { contracts } = useContracts()
  const [contractAId, setContractAId] = useState('')
  const [contractBId, setContractBId] = useState('')

  const contractA = useMemo(() => contracts.find(c => c._id === contractAId), [contracts, contractAId])
  const contractB = useMemo(() => contracts.find(c => c._id === contractBId), [contracts, contractBId])

  const isDifferent = (valA, valB) => {
    if (valA === undefined && valB === undefined) return false
    if (valA === null && valB === null) return false
    return JSON.stringify(valA) !== JSON.stringify(valB)
  }

  const formatDate = (date) => date ? moment(date).format('YYYY-MM-DD') : '-'
  const formatMoney = (amount) => amount !== undefined && amount !== null ? `¥${Number(amount).toLocaleString()}` : '-'

  const DiffCell = ({ label, icon: Icon, valueA, valueB, subA, subB }) => {
    const diff = isDifferent(valueA, valueB)
    return (
      <div className={`grid grid-cols-12 gap-4 py-4 border-b border-gray-100 ${diff ? 'bg-warning-50' : ''}`}>
        <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-gray-600">
          {Icon && <Icon size={16} className="text-gray-400" />}
          {label}
          {diff && (
            <span className="ml-1 flex items-center gap-0.5 text-xs text-warning-700 bg-warning-100 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} />
              差异
            </span>
          )}
        </div>
        <div className={`col-span-5 ${diff ? 'bg-warning-100 rounded-lg p-3 -my-1' : ''}`}>
          <div className={`text-sm ${diff ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {valueA !== undefined && valueA !== null ? valueA : '-'}
          </div>
          {subA && <div className="text-xs text-gray-500 mt-1">{subA}</div>}
        </div>
        <div className={`col-span-5 ${diff ? 'bg-warning-100 rounded-lg p-3 -my-1' : ''}`}>
          <div className={`text-sm ${diff ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {valueB !== undefined && valueB !== null ? valueB : '-'}
          </div>
          {subB && <div className="text-xs text-gray-500 mt-1">{subB}</div>}
        </div>
      </div>
    )
  }

  const diffStats = useMemo(() => {
    if (!contractA || !contractB) return { total: 0, diff: 0 }
    const checks = [
      ['amount', contractA.amount, contractB.amount],
      ['effectiveDate', contractA.effectiveDate, contractB.effectiveDate],
      ['expiryDate', contractA.expiryDate, contractB.expiryDate],
      ['signDate', contractA.signDate, contractB.signDate],
      ['paymentMethod', contractA.paymentMethod, contractB.paymentMethod],
      ['partyA.name', contractA.partyA?.name, contractB.partyA?.name],
      ['partyA.contact', contractA.partyA?.contact, contractB.partyA?.contact],
      ['partyA.address', contractA.partyA?.address, contractB.partyA?.address],
      ['partyB.name', contractA.partyB?.name, contractB.partyB?.name],
      ['partyB.contact', contractA.partyB?.contact, contractB.partyB?.contact],
      ['partyB.address', contractA.partyB?.address, contractB.partyB?.address],
      ['relatedOrderNo', contractA.relatedOrderNo, contractB.relatedOrderNo],
      ['relatedProjectNo', contractA.relatedProjectNo, contractB.relatedProjectNo],
    ]
    const diffCount = checks.filter(([, a, b]) => isDifferent(a, b)).length
    return { total: checks.length, diff: diffCount }
  }, [contractA, contractB])

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
          <p className="text-sm text-gray-500 mt-1">选择两份合同进行并排对比，快速识别关键条款差异</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <label className="form-label">选择合同 A</label>
          <select
            className="form-input"
            value={contractAId}
            onChange={(e) => setContractAId(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {contracts.filter(c => c._id !== contractBId).map(c => (
              <option key={c._id} value={c._id}>{c.contractNo} - {c.name}</option>
            ))}
          </select>
          {contractA && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-800">{contractA.name}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{contractA.type}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">{contractA.status}</span>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <label className="form-label">选择合同 B</label>
          <select
            className="form-input"
            value={contractBId}
            onChange={(e) => setContractBId(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {contracts.filter(c => c._id !== contractAId).map(c => (
              <option key={c._id} value={c._id}>{c.contractNo} - {c.name}</option>
            ))}
          </select>
          {contractB && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-800">{contractB.name}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{contractB.type}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">{contractB.status}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {(!contractA || !contractB) ? (
        <div className="card text-center py-16">
          <GitCompare size={48} className="mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500">请选择两份合同开始对比</div>
          <div className="text-xs text-gray-400 mt-2">对比将涵盖金额、期限、付款方式、甲乙双方信息和关联编号</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
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
                <div className="text-xl font-bold text-success-600">{diffStats.total - diffStats.diff}</div>
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
          </div>

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
                subA={contractA.executionPercent !== undefined ? `已执行 ${contractA.executionPercent}%` : ''}
                subB={contractB.executionPercent !== undefined ? `已执行 ${contractB.executionPercent}%` : ''}
              />
              <DiffCell
                label="已执行金额"
                valueA={formatMoney(contractA.executedAmount)}
                valueB={formatMoney(contractB.executedAmount)}
              />
              <DiffCell
                label="剩余金额"
                valueA={formatMoney(contractA.remainingAmount)}
                valueB={formatMoney(contractB.remainingAmount)}
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
              />
              <DiffCell
                label="生效日期"
                valueA={formatDate(contractA.effectiveDate)}
                valueB={formatDate(contractB.effectiveDate)}
              />
              <DiffCell
                label="到期日期"
                valueA={formatDate(contractA.expiryDate)}
                valueB={formatDate(contractB.expiryDate)}
                subA={contractA.expiryDate ? `${moment(contractA.expiryDate).diff(moment(), 'days')} 天后到期` : ''}
                subB={contractB.expiryDate ? `${moment(contractB.expiryDate).diff(moment(), 'days')} 天后到期` : ''}
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
              />
              <DiffCell
                label="甲方联系人"
                valueA={contractA.partyA?.contact || '-'}
                valueB={contractB.partyA?.contact || '-'}
              />
              <DiffCell
                label="甲方地址"
                valueA={contractA.partyA?.address || '-'}
                valueB={contractB.partyA?.address || '-'}
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
              />
              <DiffCell
                label="乙方联系人"
                valueA={contractA.partyB?.contact || '-'}
                valueB={contractB.partyB?.contact || '-'}
              />
              <DiffCell
                label="乙方地址"
                valueA={contractA.partyB?.address || '-'}
                valueB={contractB.partyB?.address || '-'}
              />
            </div>

            <div className="px-6">
              <div className="py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <Link2 size={14} className="inline mr-1" /> 关联编号
              </div>
              <DiffCell
                label="关联订单号"
                icon={Link2}
                valueA={contractA.relatedOrderNo || '-'}
                valueB={contractB.relatedOrderNo || '-'}
              />
              <DiffCell
                label="关联项目号"
                valueA={contractA.relatedProjectNo || '-'}
                valueB={contractB.relatedProjectNo || '-'}
              />
            </div>
          </div>

          <div className="card bg-blue-50 border-blue-100">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-1">商务复盘提示</div>
                <p className="text-blue-700">
                  {diffStats.diff === 0
                    ? '两份合同在关键条款上完全一致，可作为标准化模板参考。'
                    : `发现 ${diffStats.diff} 处差异，请重点关注黄色高亮标记的条款，建议在谈判前准备好差异说明。`
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
