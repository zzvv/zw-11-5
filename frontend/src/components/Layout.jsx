import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, CalendarDays, AlertTriangle } from 'lucide-react'
import AlertBanner from './AlertBanner'
import { useContracts } from '../context/ContractContext'

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/contracts', label: '合同管理', icon: FileText },
  { path: '/calendar', label: '到期日历', icon: CalendarDays },
]

export default function Layout() {
  const location = useLocation()
  const { alerts } = useContracts()
  const urgentAlerts = alerts.filter(a => a.level === 'red')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">合同管理平台</h1>
          <p className="text-xs text-gray-500 mt-1">全生命周期管理</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon size={18} />
                {item.label}
                {item.path === '/contracts' && urgentAlerts.length > 0 && (
                  <span className="ml-auto bg-danger-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {urgentAlerts.length}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
          Contract Lifecycle v1.0
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <AlertBanner />
        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
