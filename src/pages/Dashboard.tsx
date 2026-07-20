import { useState, useEffect } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isAdmin = role === 'admin'
  const isOverview = location.pathname === '/'

  const [employeeData, setEmployeeData] = useState<any>(null)
  
  // Analytics State
  const [stats, setStats] = useState({ totalLeads: 0, converted: 0, todayCalls: 0 })
  const [outcomeData, setOutcomeData] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  useEffect(() => {
    if (user && !isAdmin) {
      supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setEmployeeData(data))
    }

    if (user && isOverview) {
      fetchAnalytics()
    }
  }, [user, isAdmin, isOverview])

  const fetchAnalytics = async () => {
    try {
      if (isAdmin) {
        const { data: clients } = await supabase.from('clients').select('status')
        const { data: logs } = await supabase.from('call_logs').select('*, clients(business_name), employees(name)')
        
        if (clients && logs) {
          setStats({
            totalLeads: clients.length,
            converted: clients.filter(c => c.status === 'Interested').length,
            todayCalls: logs.filter(l => new Date(l.date).toDateString() === new Date().toDateString()).length
          })

          const counts = logs.reduce((acc: any, log) => {
            acc[log.outcome] = (acc[log.outcome] || 0) + 1
            return acc
          }, {})

          setOutcomeData(Object.keys(counts).map(key => ({ name: key, value: counts[key] })))
          
          // Sort logs manually by date descending
          const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)
          setRecentLogs(sortedLogs)
        }
      } else {
        const { data: logs } = await supabase.from('call_logs').select('*, clients(business_name)').eq('employee_id', user?.id)
        const { data: clients } = await supabase.from('clients').select('status').eq('assigned_to', user?.id)
        
        if (logs && clients) {
          setStats({
            totalLeads: clients.length,
            converted: clients.filter(c => c.status === 'Interested').length,
            todayCalls: logs.filter(l => new Date(l.date).toDateString() === new Date().toDateString()).length
          })

          const counts = logs.reduce((acc: any, log) => {
            acc[log.outcome] = (acc[log.outcome] || 0) + 1
            return acc
          }, {})

          setOutcomeData(Object.keys(counts).map(key => ({ name: key, value: counts[key] })))
          
          const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)
          setRecentLogs(sortedLogs)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">DAKH CRM</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/" className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname === '/' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
            Dashboard
          </Link>
          <Link to="/leads" className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname.includes('/leads') ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
            Leads
          </Link>
          <Link to="/commissions" className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname.includes('/commissions') ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
            Commissions
          </Link>
          {isAdmin && (
            <Link to="/employees" className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname.includes('/employees') ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
              Manage Employees
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate w-48" title={user?.email || 'User'}>
                {user?.email}
              </p>
              <button onClick={handleSignOut} className="text-xs font-medium text-blue-600 hover:text-blue-500 text-left mt-1">Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isOverview ? (
          <>
            <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isAdmin ? 'Admin Overview' : 'My Dashboard'}
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  Admin
                </span>
              )}
            </header>
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{isAdmin ? 'Total System Leads' : 'My Assigned Leads'}</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalLeads}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Successfully Converted</h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.converted}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{isAdmin ? 'Total System Calls' : 'My Total Calls'}</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.todayCalls}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</h3>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                    {stats.totalLeads > 0 ? Math.round((stats.converted / stats.totalLeads) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Graphs Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Call Outcomes Distribution</h3>
                  {outcomeData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outcomeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {outcomeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">No call data available yet.</div>
                  )}
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Performance Graph</h3>
                  {outcomeData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={outcomeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#8884d8">
                            {outcomeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">No call data available yet.</div>
                  )}
                </div>
              </div>

              {!isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">My Profile Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{employeeData?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                      <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{employeeData?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">UPI ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{employeeData?.upi_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Account Status</p>
                      <p className="font-medium text-green-600 dark:text-green-400">Active</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {isAdmin ? 'Recent System Activity' : 'My Recent Leads'}
                </h2>
                {recentLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                          {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outcome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes (Remarks)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(log.date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {log.clients?.business_name || 'Unknown Client'}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {log.employees?.name || 'Unknown'}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                log.outcome === 'Interested' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                log.outcome === 'Call Later' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {log.outcome}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={log.remarks}>
                              {log.remarks || 'No notes provided.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    {isAdmin ? 'No recent activity.' : 'No calls logged yet.'}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}

