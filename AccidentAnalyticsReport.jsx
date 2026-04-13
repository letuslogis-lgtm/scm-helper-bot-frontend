const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } = window.Recharts || {};

const AccidentAnalyticsReport = ({ userProfile }) => {
    const [accidents, setAccidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('M'); // 기본값 월간

    const getTodayStr = () => {
        const d = new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const [customDate, setCustomDate] = useState({ start: getTodayStr(), end: getTodayStr() });

    const getFilterDates = () => {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (filterType === 'D') {
            const today = format(now);
            return { startDate: today, endDate: today, label: '당일 현황' };
        } else if (filterType === 'W') {
            const day = now.getDay();
            const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { startDate: format(monday), endDate: format(sunday), label: '이번 주 현황' };
        } else if (filterType === 'M') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { startDate: format(firstDay), endDate: format(lastDay), label: '이번 달 현황' };
        } else {
            return { startDate: customDate.start, endDate: customDate.end, label: '사용자 지정 기간' };
        }
    };

    const { startDate, endDate, label } = getFilterDates();

    const fetchAnalyticsData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('logistics_accidents')
                .select('*')
                .gte('service_date', startDate)
                .lte('service_date', endDate);

            if (error) throw error;
            setAccidents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAnalyticsData(); }, [startDate, endDate]);

    // 🧠 1. 요주의 품목 (Bad Actor SKU) Top 10
    const skuData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const item = curr.item_code || '품목없음';
            if (item !== '품목없음') acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [accidents]);

    // 🧠 2. 사고 발생 ZONE 핫스팟
    const zoneData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const zone = curr.zone || '미분류';
            if (zone) acc[zone] = (acc[zone] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name: `${name} 구역`, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [accidents]);

    // 🧠 3. 요주의 작업자 (Quality Index) Top 10
    const workerData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const worker = curr.worker_name || '미상';
            if (worker !== '미상' && worker.trim() !== '') acc[worker] = (acc[worker] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [accidents]);

    // 🧠 4. AI 분석 근본 원인 (Root Cause)
    const aiCauseData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const cause = curr.ai_analyzed_cause || '분석 대기/미분류';
            acc[cause] = (acc[cause] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value);
    }, [accidents]);


    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];
    const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

    return (
        <div className="p-6 bg-slate-100 min-h-[calc(100vh-64px)] slide-up flex flex-col gap-5 max-w-[1600px] mx-auto">

            {/* 🎯 상단 헤더 및 필터 구역 (기존 대시보드와 동일한 톤앤매너) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shrink-0 z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 font-sans flex items-center gap-2">
                        <span className="text-purple-600">🕵️‍♂️ 물류 심층 분석 리포트</span>
                        <span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5 rounded border border-purple-200 font-black tracking-wide">SECRET</span>
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1.5">물류 현장의 병목과 품질 저하의 근본 원인을 파악하기 위한 관리자 전용 데이터입니다.</p>
                </div>

                <div className="flex items-center gap-2">
                    {filterType === 'CUSTOM' && (
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 animate-fade-in shadow-sm">
                            <input type="date" value={customDate.start} onChange={e => setCustomDate({ ...customDate, start: e.target.value })} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                            <span className="text-gray-400 text-xs mx-1">~</span>
                            <input type="date" value={customDate.end} onChange={e => setCustomDate({ ...customDate, end: e.target.value })} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                        </div>
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                        {[{ id: 'D', name: '당일' }, { id: 'W', name: '주간' }, { id: 'M', name: '월간' }, { id: 'CUSTOM', name: '직접지정' }].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterType(btn.id)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === btn.id ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {btn.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold text-sm">심층 데이터를 분석 중입니다...</p>
                </div>
            ) : accidents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 min-h-[400px]">
                    <p className="text-gray-400 font-bold">해당 기간에 분석할 데이터가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">

                    {/* 📦 1. 요주의 품목 (Bad Actor SKU) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><span className="text-red-500">🚨</span> 요주의 품목 (Bad Actor SKU) Top 10</h3>
                            <p className="text-[11px] text-gray-400 mt-1">이슈가 가장 빈번하게 발생하는 품목코드입니다. 적재 위치 및 포장 상태 점검이 필요합니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={skuData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} width={90} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                                        {skuData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 👤 2. 작업자 품질 지수 (Worker Quality Index) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><span className="text-orange-500">👤</span> 요주의 작업자 품질 지수 Top 10</h3>
                            <p className="text-[11px] text-gray-400 mt-1">오피킹 및 파손 빈도가 높은 작업자입니다. 타겟팅된 현장 재교육이 필요합니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] flex flex-col justify-center space-y-4 px-2">
                            {workerData.length > 0 ? workerData.map((item, index) => {
                                const maxVal = workerData[0].value;
                                const percent = ((item.value / maxVal) * 100).toFixed(0);
                                return (
                                    <div key={item.name} className="flex items-center text-sm group">
                                        <span className="w-5 text-gray-400 font-bold text-[10px]">{index + 1}</span>
                                        <span className="w-20 text-gray-700 font-bold truncate mr-3">{item.name}</span>
                                        <div className="flex-1 h-3.5 rounded-full bg-gray-100 relative overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        </div>
                                        <span className="w-10 text-right text-xs font-black text-gray-600 ml-3">{item.value}건</span>
                                    </div>
                                );
                            }) : <div className="text-center text-gray-400 font-bold text-xs">데이터가 없습니다.</div>}
                        </div>
                    </div>

                    {/* 🗺️ 3. 사고 발생 ZONE 핫스팟 */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-2">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><span className="text-blue-500">🗺️</span> 에러 핫스팟 (ZONE별 발생 비율)</h3>
                            <p className="text-[11px] text-gray-400 mt-1">특정 구역의 조도, 동선, 라벨링 상태 점검을 위한 데이터입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={zoneData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {zoneData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 🤖 4. AI 분석 근본 원인 파악 */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><span className="text-purple-600">🤖</span> AI 원인 분석 (Root Cause)</h3>
                            <p className="text-[11px] text-gray-400 mt-1">AI가 텍스트를 분석하여 도출한 사고의 근본 원인 비중입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] flex flex-col justify-center space-y-4 px-2">
                            {aiCauseData.length > 0 ? aiCauseData.map((item, index) => {
                                const total = aiCauseData.reduce((a, b) => a + b.value, 0);
                                const percent = ((item.value / total) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="flex items-center text-sm group">
                                        <span className="w-32 text-gray-700 font-bold truncate mr-3">{item.name}</span>
                                        <div className="flex-1 h-3.5 rounded-full bg-gray-100 relative overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                        </div>
                                        <div className="w-20 text-right flex items-baseline justify-end gap-1.5 ml-3">
                                            <span className="text-[11px] font-bold text-gray-400">{percent}%</span>
                                            <span className="text-xs font-black text-purple-600">{item.value}건</span>
                                        </div>
                                    </div>
                                );
                            }) : <div className="text-center text-gray-400 font-bold text-xs">데이터가 없습니다.</div>}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

window.AccidentAnalyticsReport = AccidentAnalyticsReport;