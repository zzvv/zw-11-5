import { useState, useEffect } from 'react'
import { GitCommit, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import axios from 'axios'
import moment from 'moment'

export default function ChangeTree({ contractId }) {
  const [records, setRecords] = useState([])
  const [expanded, setExpanded] = useState({})

  const fetchRecords = async () => {
    const res = await axios.get(`/api/changes/contract/${contractId}`)
    setRecords(res.data.data || [])
  }

  useEffect(() => { fetchRecords() }, [contractId])

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const typeColor = {
    '金额调整': 'bg-primary-100 text-primary-700',
    '延期': 'bg-warning-100 text-warning-700',
    '补充协议': 'bg-success-100 text-success-700',
    '终止': 'bg-danger-100 text-danger-700'
  }

  return (
    <div className="space-y-3">
      {records.length === 0 && (
        <div className="text-center text-gray-400 py-8">暂无变更记录</div>
      )}
      {records.map((record, i) => (
        <div key={record._id} className="card py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <GitCommit size={16} className="text-primary-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[record.changeType] || 'bg-gray-100 text-gray-600'}`}>
                  {record.changeType}
                </span>
                <span className="text-xs text-gray-400">v{record.previousVersion} → v{record.version}</span>
                <span className="text-xs text-gray-400 ml-auto">{moment(record.changedAt).format('YYYY-MM-DD HH:mm')}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="font-medium">{record.changedBy}</span>
                <span className="text-gray-500"> · {record.reason}</span>
              </div>
              {record.changes?.field && (
                <div className="mt-2 text-sm bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-gray-500">{record.changes.field}:</span>
                  <span className="line-through text-gray-400">{String(record.changes.oldValue)}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="font-semibold text-primary-600">{String(record.changes.newValue)}</span>
                </div>
              )}
              {record.snapshot && (
                <button
                  onClick={() => toggleExpand(record._id)}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  {expanded[record._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {expanded[record._id] ? '收起快照' : '查看快照'}
                </button>
              )}
              {expanded[record._id] && record.snapshot && (
                <pre className="mt-2 text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(record.snapshot, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
