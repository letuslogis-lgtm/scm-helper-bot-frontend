const { useState, useEffect, useMemo } = React;
const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = window.Recharts || {};

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
            const { data, error } = await window.supabase
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

    // 🧠 1. 요주의 품목 (Bad Actor SKU) Top 8
    const skuData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const item = curr.item_code || '품목없음';
            if (item !== '품목없음') acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 8);
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

    // 🧠 3. 요주의 작업자 (Quality Index) Top 8
    const workerData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const worker = curr.worker_name || '미상';
            if (worker !== '미상' && worker.trim() !== '') acc[worker] = (acc[worker] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [accidents]);

    // 🧠 4. AI 분석 근본 원인 (Root Cause)
    const aiCauseData = useMemo(() => {
        const stats = accidents.reduce((acc, curr) => {
            const cause = curr.ai_analyzed_cause || '분석 대기/미분류';
            acc[cause] = (acc[cause] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(stats).map(name => ({ name, value: stats[name] })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [accidents]);


    // 🎨 대시보드와 완벽하게 동일한 색상 팔레트 적용
    const PIE_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

    return (
        <div className="p-6 bg-slate-100 min-h-[calc(100vh-64px)] slide-up flex flex-col gap-5 max-w-[1600px] mx-auto">

            {/* 🎯 상단 헤더 및 필터 구역 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shrink-0 z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4 hover:shadow-md transition-shadow">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2">
                        🕵️‍♂️ 물류 심층 분석 리포트
                        <span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5 rounded border border-purple-100 font-black tracking-wide">ADMIN</span>
                    </h2>
                    <p className="text-xs text-gray-400 font-medium mt-1.5">조회 기간: {startDate} ~ {endDate}</p>
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
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === btn.id ? 'bg-white text-letusBlue shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {btn.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-letusBlue rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold text-sm">심층 데이터를 분석 중입니다...</p>
                </div>
            ) : accidents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 min-h-[400px]">
                    <p className="text-gray-400 font-bold text-xs">해당 기간에 분석할 데이터가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">

                    {/* 📦 1. 요주의 품목 (Bad Actor SKU) - 대시보드 커스텀 HTML 막대 스타일 적용 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">🚨 요주의 품목 (Bad Actor SKU) Top 8</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">이슈가 가장 빈번하게 발생하는 품목코드 현황입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] flex flex-col justify-center space-y-4 px-2">
                            {skuData.length > 0 ? skuData.map((item, index) => {
                                const total = skuData.reduce((a, b) => a + b.value, 0);
                                const percent = ((item.value / total) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="flex items-center text-sm group" title={`${item.name}: ${item.value}건 (${percent}%)`}>
                                        <span className="w-32 shrink-0 text-gray-600 font-semibold truncate text-right mr-4 text-xs">{item.name}</span>
                                        <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100 relative cursor-pointer">
                                            <div className="h-full rounded-r transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: '#ef4444' }}></div>
                                        </div>
                                        <span className="w-14 text-right text-xs font-bold text-gray-500 ml-3">{item.value}건</span>
                                    </div>
                                );
                            }) : <div className="text-center text-gray-400 font-bold text-xs">데이터가 없습니다.</div>}
                        </div>
                    </div>

                    {/* 👤 2. 작업자 품질 지수 (Worker Quality Index) - 대시보드 커스텀 HTML 막대 스타일 적용 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">👤 요주의 작업자 품질 지수 Top 8</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">오작업 및 파손 빈도가 높은 작업자/업체 지표입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] flex flex-col justify-center space-y-4 px-2">
                            {workerData.length > 0 ? workerData.map((item, index) => {
                                const total = workerData.reduce((a, b) => a + b.value, 0);
                                const percent = ((item.value / total) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="flex items-center text-sm group" title={`${item.name}: ${item.value}건 (${percent}%)`}>
                                        <span className="w-32 shrink-0 text-gray-600 font-semibold truncate text-right mr-4 text-xs">{item.name}</span>
                                        <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100 relative cursor-pointer">
                                            <div className="h-full rounded-r transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: '#f97316' }}></div>
                                        </div>
                                        <span className="w-14 text-right text-xs font-bold text-gray-500 ml-3">{item.value}건</span>
                                    </div>
                                );
                            }) : <div className="text-center text-gray-400 font-bold text-xs">데이터가 없습니다.</div>}
                        </div>
                    </div>

                    {/* 🗺️ 3. 사고 발생 ZONE 핫스팟 - 대시보드 도넛 차트 스타일 적용 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-2">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">🗺️ 에러 핫스팟 (ZONE별 비율)</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">물류센터 내 구역(ZONE)별 사고 발생 집중도입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[280px] relative">
                            {zoneData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        {/* 대시보드와 동일한 cy="45%" 적용하여 하단 범례 공간 확보 */}
                                        <PieChart>
                                            <Pie data={zoneData} cx="50%" cy="45%" innerRadius={65} outerRadius={90} paddingAngle={4} cornerRadius={8} dataKey="value" stroke="none">
                                                {zoneData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* 도넛 중앙 총 발생건 텍스트 (대시보드 통일) */}
                                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none w-full">
                                        <span className="text-[28px] font-black leading-tight text-gray-900">{zoneData.reduce((a, b) => a + b.value, 0)}</span>
                                        <span className="text-xs font-semibold text-gray-500 mt-1">총 발생건</span>
                                    </div>
                                </>
                            ) : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">데이터가 없습니다.</div>}
                        </div>
                    </div>

                    {/* 🤖 4. AI 분석 근본 원인 파악 - 대시보드 커스텀 HTML 막대 스타일 적용 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">🤖 AI 원인 분석 (Root Cause)</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">AI가 사고 상세 내용을 분석하여 도출한 근본 원인 현황입니다.</p>
                        </div>
                        <div className="flex-1 min-h-[250px] flex flex-col justify-center space-y-4 px-2">
                            {aiCauseData.length > 0 ? aiCauseData.map((item, index) => {
                                const total = aiCauseData.reduce((a, b) => a + b.value, 0);
                                const percent = ((item.value / total) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="flex items-center text-sm group" title={`${item.name}: ${item.value}건 (${percent}%)`}>
                                        <span className="w-32 shrink-0 text-gray-600 font-semibold truncate text-right mr-4 text-xs">{item.name}</span>
                                        <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100 relative cursor-pointer">
                                            <div className="h-full rounded-r transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: '#8b5cf6' }}></div>
                                        </div>
                                        <span className="w-14 text-right text-xs font-bold text-gray-500 ml-3">{percent}%</span>
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
