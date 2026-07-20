import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Commissions() {
  const { user, role } = useAuth()
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState<any>(null)

  const isAdmin = role === 'admin'

  useEffect(() => {
    const fetchCommissions = async () => {
      setLoading(true)
      
      // Fetch Employee's UPI details
      if (!isAdmin && user) {
        const { data: empData } = await supabase.from('employees').select('upi_id').eq('id', user.id).single()
        setEmployeeData(empData)
      }

      // Fetch Commissions
      let query = supabase.from('commissions').select('*, clients(business_name), employees(name)')
      
      if (!isAdmin && user) {
        query = query.eq('employee_id', user.id)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (!error && data) {
        setCommissions(data)
      }
      setLoading(false)
    }
    
    fetchCommissions()
  }, [user, isAdmin])

  const totalEarned = commissions.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0)
  const pendingAmount = commissions.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commissions & Payouts</h1>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Payout Rules</h2>
            <p className="text-indigo-800 dark:text-indigo-400 text-sm leading-relaxed">
              If you complete a project and get a client, we will share <strong>20% of the total project commission</strong> with you. 
              Payouts are processed within <strong>2 days</strong> after we receive the final payment from the client.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 min-w-[250px]">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Best Withdraw Option</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">UPI Transfer</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{employeeData?.upi_id || 'No UPI Linked'}</p>
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
              Request Withdrawal
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pending</h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">₹{pendingAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Paid</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">₹{totalEarned.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project / Client</th>
                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission (20%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-gray-500">Loading commissions...</td></tr>
              ) : commissions.length === 0 ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-gray-500">No commissions recorded yet.</td></tr>
              ) : (
                commissions.map((comm) => (
                  <tr key={comm.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{comm.clients?.business_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(comm.created_at).toLocaleDateString()}</div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {comm.employees?.name || 'Unknown'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      ₹{Number(comm.project_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{Number(comm.commission_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        comm.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        comm.payment_status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        comm.payment_status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {comm.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
