import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Papa from 'papaparse'

type Client = {
  id: string
  business_name: string
  contact_person: string
  phone: string
  email: string
  website: string
  type: string
  google_category: string
  category?: string
  priority?: string
  address?: string
  status?: string
  owner_name?: string
  google_rating: number
  google_reviews: number
  min_budget_inr: number
  max_budget_inr: number
  website_focus: string
  tanglish_approach_script: string
  closing_line_tanglish: string
  google_maps_url: string
  city: string
  assigned_to: string | null
  locked_by: string | null
  locked_at: string | null
  created_at: string
}

export default function Leads() {
  const [leads, setLeads] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, role } = useAuth()
  
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<string>('Interested')
  const [callNotes, setCallNotes] = useState<string>('')
  const [historyClientId, setHistoryClientId] = useState<string | null>(null)
  const [leadHistory, setLeadHistory] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchLeads = async () => {
    setLoading(true)
    // Admins and employees only see active leads in the main pool (New, Call Later)
    let query = supabase.from('clients').select('*').in('status', ['New', 'Call Later'])
    
    if (role === 'employee') {
      // Employees only see unassigned new leads, or their assigned active leads
      query = query.or(`and(status.eq.New,assigned_to.is.null),assigned_to.eq.${user?.id}`)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
    const interval = setInterval(fetchLeads, 10000) // Poll every 10 seconds to keep locks updated
    return () => clearInterval(interval)
  }, [role, user])

  const isLockedByOther = (lead: Client) => {
    if (!lead.locked_by || !lead.locked_at) return false
    if (lead.locked_by === user?.id) return false
    
    const lockTime = new Date(lead.locked_at).getTime()
    const now = new Date().getTime()
    const tenMinutes = 10 * 60 * 1000
    
    return (now - lockTime) < tenMinutes
  }

  const isLockedByMe = (lead: Client) => {
    if (!lead.locked_by || !lead.locked_at) return false
    if (lead.locked_by !== user?.id) return false
    
    const lockTime = new Date(lead.locked_at).getTime()
    const now = new Date().getTime()
    const tenMinutes = 10 * 60 * 1000
    
    return (now - lockTime) < tenMinutes
  }

  const lockLead = async (lead: Client) => {
    if (isLockedByOther(lead)) {
      alert("This lead is currently being called by someone else.")
      return
    }

    const { error } = await supabase
      .from('clients')
      .update({ 
        locked_by: user?.id, 
        locked_at: new Date().toISOString() 
      })
      .eq('id', lead.id)

    if (error) {
      alert(`Error locking lead: ${error.message}`)
      return
    }

    setActiveCallId(lead.id)
    setCallStatus('Interested')
    setCallNotes('')
    fetchLeads()
  }

  const submitCallOutcome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCallId) return

    if (!callNotes.trim()) {
      alert("Notes are mandatory. Please detail what happened in the call.")
      return
    }

    setLoading(true)

    // 1. Update Lead
    const { error: clientError } = await supabase
      .from('clients')
      .update({
        status: callStatus,
        assigned_to: user?.id,
        locked_by: null,
        locked_at: null
      })
      .eq('id', activeCallId)

    if (clientError) {
      alert(`Error updating client: ${clientError.message}`)
      setLoading(false)
      return
    }

    // 2. Add Call Log
    const { error: logError } = await supabase
      .from('call_logs')
      .insert({
        client_id: activeCallId,
        employee_id: user?.id,
        outcome: callStatus,
        remarks: callNotes,
        duration: 0 // Could implement a timer in the future
      })

    if (logError) {
      alert(`Error logging call: ${logError.message}`)
    }

    setActiveCallId(null)
    fetchLeads()
  }

  const cancelCall = async () => {
    if (!activeCallId) return
    
    await supabase
      .from('clients')
      .update({
        locked_by: null,
        locked_at: null
      })
      .eq('id', activeCallId)
      
    setActiveCallId(null)
    fetchLeads()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newClients = results.data.map((row: any) => ({
          business_name: row['Business_Name'] || row['Business Name'] || 'Unknown Business',
          owner_name: row['Contact Person'] || row.contact_person || '',
          phone: row['Phone'] || row.phone || '',
          phone_raw: row['Phone_Raw'] || '',
          email: row['Email'] || row.email || '',
          website: row['Website'] || row.website || '',
          address: row['Address'] || row.address || '',
          city: row['City'] || row.city || '',
          state: row['State'] || row.state || '',
          country: row['Country'] || '',
          postal_code: row['Postal_Code'] || '',
          type: row['Type'] || '',
          category: row['Google_Category'] || '',
          google_rating: row['Google_Rating'] ? parseFloat(row['Google_Rating']) : null,
          google_reviews: row['Reviews_Count'] ? parseInt(row['Reviews_Count'], 10) : null,
          min_budget_inr: row['Min_Budget_INR'] ? parseFloat(row['Min_Budget_INR']) : null,
          max_budget_inr: row['Max_Budget_INR'] ? parseFloat(row['Max_Budget_INR']) : null,
          website_focus: row['Website_Focus'] || '',
          tanglish_approach_script: row['Tanglish_Approach_Script'] || '',
          closing_line_tanglish: row['Closing_Line_Tanglish'] || '',
          google_maps_url: row['Google_Maps_URL'] || '',
          priority: row['Priority'] || 'medium',
          source: row['Source'] || row.source || 'CSV Import'
        }))

        const { error } = await supabase.from('clients').insert(newClients)
        if (error) {
          alert(`Error uploading: ${error.message}`)
        } else {
          alert(`Successfully uploaded ${newClients.length} leads!`)
          fetchLeads()
        }
        setLoading(false)
        setShowUploadModal(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`)
        setLoading(false)
        setShowUploadModal(false)
      }
    })
  }

  const fetchHistory = async (clientId: string) => {
    setHistoryClientId(clientId)
    const { data, error } = await supabase
      .from('call_logs')
      .select('*, employees(name)')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      
    if (!error && data) {
      setLeadHistory(data)
    }
  }

  const deleteCallLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this call log?')) return
    const { error } = await supabase.from('call_logs').delete().eq('id', logId)
    if (error) {
      alert(`Error deleting call log: ${error.message}`)
    } else if (historyClientId) {
      fetchHistory(historyClientId)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads Management</h1>
        <div className="flex space-x-3">
          {role === 'admin' && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Upload CSV
            </button>
          )}
          <button
            onClick={() => fetchLeads()}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-medium ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            title="Refresh Leads"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      
      {error && <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business_Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google_Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postal_Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone_Raw</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google_Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviews_Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min_Budget_INR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max_Budget_INR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website_Focus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emp_Comm_Min_20pct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emp_Comm_Max_20pct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanglish_Approach</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing_Line_Tanglish</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google_Maps_URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {leads.map((lead) => {
                const lockedOther = isLockedByOther(lead)
                const lockedMe = isLockedByMe(lead)
                
                return (
                  <tr key={lead.id} className={`${lockedOther ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60' : ''} ${lockedMe ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.priority || 'medium'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{lead.business_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.google_category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{lead.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.google_rating}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.google_reviews}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{lead.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.min_budget_inr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.max_budget_inr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{lead.website_focus}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{lead.min_budget_inr ? (lead.min_budget_inr * 0.20) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{lead.max_budget_inr ? (lead.max_budget_inr * 0.20) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{lead.tanglish_approach_script}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{lead.closing_line_tanglish}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 hover:underline"><a href={lead.google_maps_url} target="_blank" rel="noreferrer">Map Link</a></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {lead.status}
                      </span>
                      {lockedOther && <span className="ml-2 text-xs text-red-500 flex items-center mt-1">Locked</span>}
                      {lockedMe && <span className="ml-2 text-xs text-blue-500 flex items-center mt-1">Calling...</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] space-x-2">
                      <button
                        onClick={() => fetchHistory(lead.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-md transition-colors text-xs"
                      >
                        History
                      </button>
                      {lockedMe ? (
                        <span className="text-blue-600 font-bold pr-2">Call in Progress</span>
                      ) : (
                        <button 
                          onClick={() => lockLead(lead)} 
                          disabled={lockedOther}
                          className={`text-white px-4 py-1.5 rounded-md text-sm transition-colors ${lockedOther ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          Start Call
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No leads available in the shared pool.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Modal */}
      {activeCallId && (() => {
        const activeLead = leads.find(l => l.id === activeCallId);
        if (!activeLead) return null;
        
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></span>
                        Active Call: {activeLead.business_name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">{activeLead.phone} {activeLead.owner_name ? `- ${activeLead.owner_name}` : ''}</p>
                      {activeLead.google_maps_url && (
                        <a href={activeLead.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center mt-2">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          View on Google Maps
                        </a>
                      )}
                    </div>
                    <button onClick={cancelCall} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>

                  {/* Scripts and Info Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-5 border border-indigo-100 dark:border-indigo-800">
                      <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">Approach Script (Tanglish)</h3>
                      <p className="text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed">{activeLead.tanglish_approach_script || 'No script provided.'}</p>
                      
                      <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mt-4 mb-2">Closing Line (Tanglish)</h3>
                      <p className="text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed font-medium">{activeLead.closing_line_tanglish || 'No closing line provided.'}</p>
                      
                      <div className="mt-6 bg-yellow-100 dark:bg-yellow-900/40 p-4 rounded-md border border-yellow-200 dark:border-yellow-700/50">
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-400 mb-1 flex items-center">
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Next Steps Guide
                        </h4>
                        <ul className="text-sm text-yellow-900 dark:text-yellow-200 space-y-1 list-disc pl-5">
                          <li><span className="font-semibold">Minimum Budget to Quote:</span> ₹{activeLead.min_budget_inr || 'N/A'}</li>
                          <li><span className="font-semibold">If Client is OK:</span> Ask them to share details with CEO via WhatsApp at <span className="font-bold">+91 8667399640</span>.</li>
                          <li><span className="font-semibold">If Doubt / Call Later:</span> Mark as "Call Later". This lead will stay locked to you so only YOU can follow up.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 border border-gray-200 dark:border-gray-700 space-y-4 h-fit">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business Intelligence</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                          <p className="font-medium text-gray-900 dark:text-white truncate" title={activeLead.category}>{activeLead.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Website Focus</p>
                          <p className="font-medium text-gray-900 dark:text-white">{activeLead.website_focus || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Budget Match</p>
                          <p className="font-medium text-gray-900 dark:text-white">{activeLead.min_budget_inr ? `₹${activeLead.min_budget_inr}` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Google Rating</p>
                          <p className="font-medium text-gray-900 dark:text-white">{activeLead.google_rating ? `${activeLead.google_rating} ⭐ (${activeLead.google_reviews} reviews)` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={submitCallOutcome} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Call Outcome</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                          value={callStatus}
                          onChange={(e) => setCallStatus(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Interested">Interested</option>
                          <option value="Call Later">Call Later</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="Wrong Number">Wrong Number</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Required)*</label>
                        <textarea
                          rows={2}
                          required
                          value={callNotes}
                          onChange={(e) => setCallNotes(e.target.value)}
                          placeholder="You MUST enter details about the call here..."
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4 flex flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                      >
                        Save Outcome
                      </button>
                      <button
                        type="button"
                        onClick={cancelCall}
                        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
        );
      })()}

      {historyClientId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Call History</h2>
              <button onClick={() => setHistoryClientId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {leadHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No calls have been logged for this lead yet.</p>
              ) : (
                <div className="space-y-4">
                  {leadHistory.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{log.employees?.name || 'Unknown Agent'}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                            {new Date(log.date).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            log.outcome === 'Interested' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            log.outcome === 'Call Later' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {log.outcome}
                          </span>
                          {role === 'admin' && (
                            <button
                              onClick={() => deleteCallLog(log.id)}
                              className="text-red-500 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-900/20 p-1.5 rounded-md border border-red-200 dark:border-red-900/50"
                              title="Delete call log"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {log.remarks && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{log.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setHistoryClientId(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CSV Upload Instructions Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upload CSV Instructions</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md border border-yellow-200 dark:border-yellow-700 mb-6">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">
                Your CSV file MUST contain the exact following headlines in the first row. If any headline is missing or misspelled, the upload will fail.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 text-xs font-mono bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <span>Priority</span>
                <span>Business_Name</span>
                <span>Type</span>
                <span>Google_Category</span>
                <span>City</span>
                <span>State</span>
                <span>Country</span>
                <span>Postal_Code</span>
                <span>Phone</span>
                <span>Phone_Raw</span>
                <span>Google_Rating</span>
                <span>Reviews_Count</span>
                <span>Address</span>
                <span>Min_Budget_INR</span>
                <span>Max_Budget_INR</span>
                <span>Website_Focus</span>
                <span>Employee_Commission_Min_20pct</span>
                <span>Employee_Commission_Max_20pct</span>
                <span>Tanglish_Approach_Script</span>
                <span>Closing_Line_Tanglish</span>
                <span>Google_Maps_URL</span>
              </div>
            </div>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-upload-modal"
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <label 
                htmlFor="csv-upload-modal" 
                className="cursor-pointer px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Select & Add CSV
              </label>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
