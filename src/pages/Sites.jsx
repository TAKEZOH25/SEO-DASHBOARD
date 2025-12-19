import React, { useState, useEffect } from 'react';
import Sparkline from '../components/ui/Sparkline';
import { MoreVertical, ExternalLink, ShieldCheck, LogIn, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { fetchSites, fetchSearchAnalytics } from '../services/gscApi';
import { useNavigate } from 'react-router-dom';

export default function Sites() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);

    // Helper: Get date range (Last 28 days)
    const getDateRange = () => {
        const end = new Date();
        end.setDate(end.getDate() - 3); // GSC data is delayed by ~2-3 days
        const start = new Date();
        start.setDate(end.getDate() - 28);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    };

    // Authenticate with Google
    const login = useGoogleLogin({
        onSuccess: (codeResponse) => setUser(codeResponse),
        onError: (error) => console.log('Login Failed:', error),
        scope: 'https://www.googleapis.com/auth/webmasters.readonly'
    });

    // Fetch Sites & Stats
    // Helper: Clean domain for display and favicons
    const formatDomain = (url) => {
        let clean = url;
        if (clean.startsWith('sc-domain:')) clean = clean.replace('sc-domain:', '');
        if (clean.startsWith('https://')) clean = clean.replace('https://', '');
        if (clean.startsWith('http://')) clean = clean.replace('http://', '');
        if (clean.endsWith('/')) clean = clean.slice(0, -1);
        return clean;
    };

    // Fetch Sites & Stats
    useEffect(() => {
        if (user && user.access_token) {
            setLoading(true);
            fetchSites(user.access_token)
                .then(async (siteList) => {
                    // 1. Init sites & Deduplicate
                    const uniqueSitesMap = new Map();

                    siteList.forEach((site, index) => {
                        const cleanDomain = formatDomain(site.siteUrl);
                        const existing = uniqueSitesMap.get(cleanDomain);

                        // Priority: sc-domain > https > others
                        const isDomainProperty = site.siteUrl.startsWith('sc-domain:');

                        if (!existing || (isDomainProperty && !existing.rawId.startsWith('sc-domain:'))) {
                            uniqueSitesMap.set(cleanDomain, {
                                id: index,
                                rawId: site.siteUrl,
                                domain: cleanDomain,
                                favicon: `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`,
                                permissionLevel: site.permissionLevel,
                                rd: "-",
                                visits: { total: 0, trend: [] },
                                clicks: { total: 0, trend: [] },
                                impressions: { total: 0, trend: [] },
                                keywords: { total: "-", trend: [] }
                            });
                        }
                    });

                    const initialSites = Array.from(uniqueSitesMap.values());

                    // Sort verfied sites first, then alphabetical
                    initialSites.sort((a, b) => {
                        if (a.permissionLevel === b.permissionLevel) {
                            return a.domain.localeCompare(b.domain);
                        }
                        return a.permissionLevel === 'siteOwner' ? -1 : 1;
                    });

                    setSites(initialSites);
                    setLoading(false);

                    // 2. Background fetch stats for each site
                    const { startDate, endDate } = getDateRange();

                    // We fetch sequentially or in small batches to avoid rate limits if many sites
                    const updatedSites = [...initialSites];

                    // Limit to first 20 sites to avoid huge load for now
                    const limit = Math.min(updatedSites.length, 20);

                    for (let i = 0; i < limit; i++) {
                        const site = updatedSites[i];

                        // Skip if user logged out
                        if (!user) break;

                        try {
                            const analytics = await fetchSearchAnalytics(user.access_token, site.rawId, startDate, endDate);
                            if (analytics && analytics.rows) {
                                // Process time series
                                const navClicks = analytics.rows.map(r => r.clicks);
                                const navImpressions = analytics.rows.map(r => r.impressions);

                                // Update local object
                                updatedSites[i] = {
                                    ...site,
                                    visits: {
                                        total: navClicks.reduce((a, b) => a + b, 0), // Using Clics as Visits proxy
                                        trend: navClicks
                                    },
                                    clicks: {
                                        total: navClicks.reduce((a, b) => a + b, 0),
                                        trend: navClicks
                                    },
                                    impressions: {
                                        total: navImpressions.reduce((a, b) => a + b, 0),
                                        trend: navImpressions
                                    }
                                };
                                // Update state progressively so user sees data loading
                                setSites([...updatedSites]);
                            }
                        } catch (err) {
                            console.error(`Failed stats for ${site.domain}`, err);
                        }
                    }

                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [user]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight">SEO DASHBOARD</h1>

                {!user ? (
                    <button onClick={() => login()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20 flex items-center">
                        <LogIn size={18} className="mr-2" /> Connect Google
                    </button>
                ) : (
                    <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-400">Connected</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                )}
            </div>

            <div className="bg-[#18191c] border border-[#27282b] rounded-2xl overflow-hidden shadow-xl">
                {sites.length === 0 && !loading && !user && (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                        <ShieldCheck size={48} className="mb-4 text-gray-700" />
                        <p>Connect your Google Account to view your Search Console sites.</p>
                    </div>
                )}

                {loading && sites.length === 0 && (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        Loading sites list...
                    </div>
                )}

                {sites.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#27282b] text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="p-6 font-medium pl-8 w-1/4">Domain</th>
                                    <th className="p-6 font-medium text-center">RD</th>
                                    <th className="p-6 font-medium text-center">Visits (Est.)</th>
                                    <th className="p-6 font-medium text-center">Keywords</th>
                                    <th className="p-6 font-medium text-center">Clicks</th>
                                    <th className="p-6 font-medium text-center">Impressions</th>
                                    <th className="p-6 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27282b] text-sm">
                                {sites.map((site) => (
                                    <tr key={site.domain}
                                        onClick={() => navigate(`/sites/${encodeURIComponent(site.rawId)}`)}
                                        className="group hover:bg-[#1f2023] transition-colors cursor-pointer"
                                    >

                                        {/* Domain Column */}
                                        <td className="p-6 pl-8">
                                            <div className="flex flex-col justify-center h-full">
                                                <div className="flex items-center space-x-4 mb-1.5">
                                                    <img src={site.favicon} alt="" className="w-6 h-6 rounded-md bg-white/10 p-0.5" />
                                                    <a href={site.domain} target="_blank" rel="noreferrer" className="font-semibold text-base text-white hover:text-indigo-400 hover:underline decoration-indigo-400/50 underline-offset-4 transition-all max-w-[200px] truncate">
                                                        {site.domain}
                                                    </a>
                                                    {site.permissionLevel === 'siteOwner' && <ShieldCheck size={16} className="text-emerald-500" />}
                                                </div>
                                            </div>
                                        </td>

                                        {/* RD (Placeholder) */}
                                        <td className="p-6 text-center">
                                            <span className="font-semibold text-sm text-gray-600">{site.rd}</span>
                                        </td>

                                        {/* Visits (Clicks Proxy) */}
                                        <td className="p-6">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <span className="font-bold text-lg text-white">{site.visits.total.toLocaleString()}</span>
                                                <Sparkline data={site.visits.trend} color="#F59E0B" />
                                            </div>
                                        </td>

                                        {/* Keywords (Placeholder) */}
                                        <td className="p-6">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <span className="font-bold text-lg text-white">-</span>
                                            </div>
                                        </td>

                                        {/* Clicks */}
                                        <td className="p-6">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <span className="font-bold text-lg text-white">{site.clicks.total.toLocaleString()}</span>
                                                <Sparkline data={site.clicks.trend} color="#8B5CF6" />
                                            </div>
                                        </td>

                                        {/* Impressions */}
                                        <td className="p-6">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <span className="font-bold text-lg text-white">{site.impressions.total.toLocaleString()}</span>
                                                <Sparkline data={site.impressions.trend} color="#EC4899" />
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="p-6 text-right pr-6">
                                            <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                                                <MoreVertical size={20} />
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
