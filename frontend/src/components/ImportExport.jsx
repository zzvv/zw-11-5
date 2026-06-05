import { useState } from 'react'
import { Upload, Download, FileJson } from 'lucide-react'
import { useContracts } from '../context/ContractContext'

export default function ImportExport() {
  const { contracts, importContracts } = useContracts()
  const [importing, setImporting] = useState(false)

  const handleExport = () => {
    const data = JSON.stringify(contracts, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `合同台账_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        await importContracts(Array.isArray(data) ? data : [data])
        alert('导入成功')
      } catch (err) {
        alert('导入失败: ' + err.message)
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} className="btn-secondary text-sm">
        <Download size={14} />
        导出JSON
      </button>
      <label className="btn-secondary text-sm cursor-pointer">
        <Upload size={14} />
        {importing ? '导入中...' : '导入JSON'}
        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
      </label>
    </div>
  )
}
