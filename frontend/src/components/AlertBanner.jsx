import { useState } from 'react'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import moment from 'moment'

export default function AlertBanner() {
  const { alerts } = useContracts()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || alerts.length === 0) return null

  const redCount = alerts.filter(a => a.level === 'red').length
  const yellowCount = alerts.filter(a => a.level === 'yellow').length

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-8 py-3 flex items-center gap-3">
        <AlertTriangle size={18} className={redCount > 0 ? 'text-danger-500' : 'text-warning-500'} />
        <div className="flex-1 text-sm">
          <span className="font-medium">
            预警提醒：{redCount > 0 && <span className="text-danger-600">{redCount} 项紧急</span>}
            {redCount > 0 && yellowCount > 0 && '，'}
            {yellowCount > 0 && <span className="text-warning-600">{yellowCount} 项即将到期</span>}
          </span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      {expanded && (
        <div className="px-8 pb-4 space-y-2">
          {alerts.slice(0, 10).map((alert, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
                alert.level === 'red' ? 'bg-danger-50 text-danger-700' :
                alert.level === 'yellow' ? 'bg-warning-50 text-warning-700' :
                'bg-success-50 text-success-700'
              }`}
            >
              <span className="font-medium">{alert.type}</span>
              <span className="flex-1">{alert.message}</span>
              <span className="text-xs opacity-70">{moment(alert.date).format('YYYY-MM-DD')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
