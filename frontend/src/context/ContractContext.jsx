import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'

const API_BASE = '/api'

const ContractContext = createContext()

export const ContractProvider = ({ children }) => {
  const [contracts, setContracts] = useState([])
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchContracts = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await axios.get(`${API_BASE}/contracts?${params}`)
      setContracts(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/stats`)
      setStats(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/alerts`)
      setAlerts(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const createContract = async (data) => {
    const res = await axios.post(`${API_BASE}/contracts`, data)
    await fetchContracts()
    return res.data
  }

  const updateContract = async (id, data) => {
    const res = await axios.put(`${API_BASE}/contracts/${id}`, data)
    await fetchContracts()
    return res.data
  }

  const deleteContract = async (id) => {
    await axios.delete(`${API_BASE}/contracts/${id}`)
    await fetchContracts()
  }

  const importContracts = async (contractsData) => {
    const res = await axios.post(`${API_BASE}/contracts/import`, { contracts: contractsData })
    await fetchContracts()
    return res.data
  }

  useEffect(() => {
    fetchContracts()
    fetchStats()
    fetchAlerts()
  }, [fetchContracts, fetchStats, fetchAlerts])

  return (
    <ContractContext.Provider value={{
      contracts, stats, alerts, loading,
      fetchContracts, fetchStats, fetchAlerts,
      createContract, updateContract, deleteContract, importContracts
    }}>
      {children}
    </ContractContext.Provider>
  )
}

export const useContracts = () => useContext(ContractContext)
