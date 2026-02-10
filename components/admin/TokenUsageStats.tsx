
'use client';

import { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Calendar, Download, Search, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface TokenUsageStatsProps {
    className?: string;
}

export default function TokenUsageStats({ className }: TokenUsageStatsProps) {
    const [data, setData] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [limit, setLimit] = useState<number | 'All'>(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('limit', limit.toString());
            params.append('page', page.toString());

            const res = await fetch(`/api/admin/token-usage?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
                setChartData(json.chartData);
                setSummary(json.summary);
                setTotalPages(json.meta.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch token usage", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, limit, startDate, endDate]); // Search triggers manually or debounce? Let's trigger on enter or blur for now, or just add a button.

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 1) setPage(1);
            else fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleExport = () => {
        // Simple CSV Export
        const headers = ["Date", "User", "Purpose", "Tokens", "Model"];
        const rows = data.map(item => [
            new Date(item.createdAt).toLocaleString(),
            item.userName || item.userId || 'Guest',
            item.purpose,
            item.tokens,
            item.model || 'N/A'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `token_usage_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Total Tokens Used</p>
                    <h3 className="text-2xl font-bold text-slate-800">
                        {summary.totalTokensUsed?.toLocaleString() || 0}
                    </h3>
                </div>
                {/* Add more metrics if needed */}
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[300px]">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Usage Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            labelFormatter={(label) => format(new Date(label), 'PPP')}
                        />
                        <Line
                            type="monotone"
                            dataKey="tokens"
                            stroke="#0891b2"
                            strokeWidth={2}
                            activeDot={{ r: 8 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Filters & Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search User or Purpose..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">From:</span>
                        <input
                            type="date"
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">To:</span>
                        <input
                            type="date"
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Date & Time</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Requested By</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Purpose</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Tokens</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Model</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading usage data...</td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No records found.</td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {item.userName || item.userId || <span className="text-slate-400 italic">Guest</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {item.purpose}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-cyan-600">
                                            {item.tokens.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {item.model || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Show:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(e.target.value === 'All' ? 'All' : parseInt(e.target.value));
                                setPage(1);
                            }}
                            className="border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value="All">All</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
