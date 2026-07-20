import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Employee = {
  id: string
  name: string
  email: string
  phone: string
  upi_id: string
  identity_proof_url: string
  profile_image_url: string
  status: 'pending' | 'active' | 'suspended'
  role: string
  joined_at: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('joined_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEmployees(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert(`Error updating status: ${error.message}`)
    } else {
      fetchEmployees()
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading employees...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Employees</h1>
      
      {error && <div className="mb-4 text-red-500">{error}</div>}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proofs</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                         <img 
                           src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(emp.name || emp.email)}`} 
                           alt="" 
                           className="h-10 w-10 object-cover" 
                         />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{emp.phone || 'N/A'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">UPI: {emp.upi_id || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     {emp.identity_proof_url && emp.identity_proof_url !== 'N/A' ? (
                       <a href={emp.identity_proof_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">View ID Proof</a>
                     ) : (
                       <span className="text-sm text-gray-400">No Proof</span>
                     )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${emp.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                        emp.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {emp.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(emp.id, 'active')} 
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors mr-4"
                      >
                        Approve
                      </button>
                    )}
                    {emp.status === 'active' && (
                      <button 
                        onClick={() => updateStatus(emp.id, 'suspended')} 
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {emp.status === 'suspended' && (
                      <button 
                        onClick={() => updateStatus(emp.id, 'active')} 
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
