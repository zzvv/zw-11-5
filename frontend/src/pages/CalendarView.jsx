import { useState, useEffect } from 'react'
import { Calendar as ReactCalendar } from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { Link } from 'react-router-dom'
import axios from 'axios'
import moment from 'moment'
import { AlertTriangle, DollarSign } from 'lucide-react'

export default function CalendarView() {
  const [date, setDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState({ contracts: [], payments: [] })

  useEffect(() => {
    fetchCalendarData()
  }, [date])

  const fetchCalendarData = async () => {
    const year = moment(date).year()
    const month = moment(date).month() + 1
    try {
      const res = await axios.get(`/api/dashboard/calendar?year=${year}&month=${month}`)
      setCalendarData(res.data.data || { contracts: [], payments: [] })
    } catch (err) {
      console.error(err)
    }
  }

  const getDayEvents = (day) => {
    const dateStr = moment(day).format('YYYY-MM-DD')
    const contracts = calendarData.contracts.filter(c =>
      moment(c.expiryDate).format('YYYY-MM-DD') === dateStr
    )
    const payments = calendarData.payments.filter(p =>
      moment(p.dueDate).format('YYYY-MM-DD') === dateStr
    )
    return { contracts, payments }
  }

  const tileContent = ({ date: day }) => {
    const { contracts, payments } = getDayEvents(day)
    if (contracts.length === 0 && payments.length === 0) return null

    return (
      <div className="flex flex-col gap-0.5 mt-1">
        {contracts.map(c => (
          <div key={c._id} className="text-[10px] px-1 py-0.5 bg-danger-100 text-danger-700 rounded truncate flex items-center gap-0.5">
            <AlertTriangle size={8} />
            {c.name.slice(0, 4)}到期
          </div>
        ))}
        {payments.map(p => (
          <div key={p._id} className="text-[10px] px-1 py-0.5 bg-warning-100 text-warning-700 rounded truncate flex items-center gap-0.5">
            <DollarSign size={8} />
            ¥{p.amount.toLocaleString()}
          </div>
        ))}
      </div>
    )
  }

  const selectedDateStr = moment(date).format('YYYY-MM-DD')
  const { contracts: selectedContracts, payments: selectedPayments } = getDayEvents(date)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">到期日历</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-4">
          <ReactCalendar
            onChange={setDate}
            value={date}
            tileContent={tileContent}
            locale="zh-CN"
          />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {selectedDateStr} 事件
            </h3>

            {selectedContracts.length === 0 && selectedPayments.length === 0 && (
              <div className="text-sm text-gray-400">当天无到期事件</div>
            )}

            {selectedContracts.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-xs font-medium text-danger-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> 合同到期
                </div>
                {selectedContracts.map(c => (
                  <Link key={c._id} to={`/contracts/${c._id}`} className="block text-sm p-2 bg-danger-50 rounded-lg hover:bg-danger-100">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">编号: {c.contractNo} | 金额: ¥{c.amount.toLocaleString()}</div>
                  </Link>
                ))}
              </div>
            )}

            {selectedPayments.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-warning-600 flex items-center gap-1">
                  <DollarSign size={12} /> 付款节点
                </div>
                {selectedPayments.map(p => (
                  <div key={p._id} className="text-sm p-2 bg-warning-50 rounded-lg">
                    <div className="font-medium">{p.contractId?.name}</div>
                    <div className="text-xs text-gray-500">{p.nodeName} | 应付 ¥{p.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">本月统计</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">合同到期</span>
                <span className="font-medium">{calendarData.contracts.length} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">付款节点</span>
                <span className="font-medium">{calendarData.payments.length} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">本月应付总额</span>
                <span className="font-medium text-warning-600">
                  ¥{calendarData.payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
