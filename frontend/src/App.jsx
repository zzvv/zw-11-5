import { Routes, Route } from 'react-router-dom'
import { ContractProvider } from './context/ContractContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ContractList from './pages/ContractList'
import ContractDetail from './pages/ContractDetail'
import CalendarView from './pages/CalendarView'

function App() {
  return (
    <ContractProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="calendar" element={<CalendarView />} />
        </Route>
      </Routes>
    </ContractProvider>
  )
}

export default App
