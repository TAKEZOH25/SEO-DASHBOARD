import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Search } from 'lucide-react';
import { fetchSearchAnalytics, fetchSearchAnalyticsBreakdown } from '../services/gscApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext';

export default function SiteDetails() {
    const { siteId } = useParams(); // encoded site URL
    const navigate = useNavigate();
    const { user, login } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('queries'); // 'queries' | 'pages'
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState(28); // Default 28 days
    const [errorMsg, setErrorMsg] = useState(null);

    // Data State
    const [stats, setStats] = useState([]);
    const [queries, setQueries] = useState([]);
    const [pages, setPages] = useState([]);

    // Decode the site ID safely
    const decodedSiteId = decodeURIComponent(siteId);
    // Display domain logic
    const displayDomain = decodedSiteId.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/\/$/, '');

    // Helper date
    const getDateRange = (days) => {
        const end = new Date();
        end.setDate(end.getDate() - 3);
        const start = new Date();
        start.setDate(end.getDate() - days);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    };

    useEffect(() => {
        if (user && user.access_token) {
            setLoading(true);
            setErrorMsg(null);

            const { startDate, endDate } = getDateRange(timeRange);

            console.log("Fetching details for:", decodedSiteId);

            Promise.all([
                fetchSearchAnalytics(user.access_token, decodedSiteId, startDate, endDate).catch(e => { console.error('Trend Error', e); return null; }),
                fetchSearchAnalyticsBreakdown(user.access_token, decodedSiteId, startDate, endDate, 'query').catch(e => { console.error('Query Error', e); return []; }),
                fetchSearchAnalyticsBreakdown(user.access_token, decodedSiteId, startDate, endDate, 'page').catch(e => { console.error('Page Error', e); return []; })
            ]).then(([trendData, queryData, pageData]) => {

                // Handle Trend Data safe check
                if (trendData && trendData.rows) {
                    setStats(trendData.rows);
                } else {
                    setStats([]); // Empty chart if no data or error
                }

                setQueries(queryData || []);
                setPages(pageData || []);
                setLoading(false);
            }).catch(err => {
                console.error("Critical Error loading site details:", err);
                setErrorMsg("Something went wrong loading data.");
                setLoading(false);
            });
        }
    }, [user, decodedSiteId, timeRange]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-[#18191c] rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center space-x-3">
                        <img src={`https://www.google.com/s2/favicons?domain=${displayDomain}&sz=64`} className="w-8 h-8 rounded-md" />
                        <h1 className="text-2xl font-bold text-white">{displayDomain}</h1>
                    </div>
                </div>

                {/* Date Selector */}
                <div className="flex bg-[#18191c] p-1 rounded-lg border border-[#27282b]">
                    {[
                        { label: '7 Days', value: 7 },
                        { label: '28 Days', value: 28 },
                        { label: '3 Months', value: 90 },
                        { label: '6 Months', value: 180 }
                    ].map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === range.value ? 'bg-[#2a2b2f] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {!user ? (
                <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                    <p className="text-gray-400">Security Check: Please confirm connection.</p>
                    <button onClick={() => login()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20">
                        Authorize View
                    </button>
                </div>
            ) : (
                <>
                    {/* Error Display */}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl">
                            {errorMsg}
                        </div>
                    )}

                    {/* Main Chart */}
                    <div className="bg-[#18191c] border border-[#27282b] rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[350px]">
                        <h3 className="text-lg font-medium text-gray-300 mb-6 flex items-center">
                            <Calendar size={18} className="mr-2 text-indigo-400" /> Performance (Last {timeRange} Days)
                        </h3>

                        {!loading && stats.length > 0 ? (
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats}>
                                        <defs>
                                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27282b" vertical={false} />
                                        <XAxis dataKey="keys[0]" hide />
                                        <YAxis yAxisId="clicks" orientation="left" stroke="#8B5CF6" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="impressions" orientation="right" stroke="#EC4899" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2023', borderColor: '#374151', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#9ca3af' }}
                                        />
                                        <Area yAxisId="clicks" type="monotone" dataKey="clicks" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                                        <Line yAxisId="impressions" type="monotone" dataKey="impressions" stroke="#EC4899" strokeWidth={2} dot={false} name="Impressions" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-500">
                                {loading ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                        Loading chart data...
                                    </div>
                                ) : (
                                    'No traffic data available for this period.'
                                )}
                            </div>
                        )}
                    </div>

                    {/* Data Tabs */}
                    <div className="space-y-4">
                        <div className="flex space-x-1 bg-[#18191c] p-1 rounded-xl w-fit border border-[#27282b]">
                            <button
                                onClick={() => setActiveTab('queries')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'queries' ? 'bg-[#2a2b2f] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="flex items-center"><Search size={16} className="mr-2" /> Top Keywords</div>
                            </button>
                            <button
                                onClick={() => setActiveTab('pages')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pages' ? 'bg-[#2a2b2f] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="flex items-center"><FileText size={16} className="mr-2" /> Top Pages</div>
                            </button>
                        </div>

                        <div className="bg-[#18191c] border border-[#27282b] rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#27282b] text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 pl-6 font-medium w-1/2">{activeTab === 'queries' ? 'Keyword' : 'Page URL'}</th>
                                        <th className="p-4 font-medium text-right">Clicks</th>
                                        <th className="p-4 font-medium text-right">Impressions</th>
                                        <th className="p-4 font-medium text-right">CTR</th>
                                        <th className="p-4 font-medium text-right pr-6">Position</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#27282b] text-sm">
                                    {(activeTab === 'queries' ? queries : pages).map((row, i) => (
                                        <tr key={i} className="hover:bg-[#1f2023] transition-colors">
                                            <td className="p-4 pl-6 font-medium text-white truncate max-w-[300px]" title={row.keys[0]}>
                                                {row.keys[0].replace('https://', '')}
                                            </td>
                                            <td className="p-4 text-right text-gray-300">{row.clicks.toLocaleString()}</td>
                                            <td className="p-4 text-right text-gray-300">{row.impressions.toLocaleString()}</td>
                                            <td className="p-4 text-right text-gray-300">{(row.ctr * 100).toFixed(1)}%</td>
                                            <td className="p-4 text-right pr-6 text-gray-300">{row.position.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                    {(activeTab === 'queries' ? queries : pages).length === 0 && !loading && (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500">No data found for this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {loading && (activeTab === 'queries' ? queries : pages).length === 0 && (
                                <div className="p-12 flex justify-center text-gray-500 flex-col items-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    Loading detailed stats...
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
