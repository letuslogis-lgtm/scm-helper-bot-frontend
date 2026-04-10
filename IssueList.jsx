const { useState, useEffect, useMemo } = React;
const { TableSkeleton, CategoryBadge, StatusBadge, formatDateTime } = window; // SharedUI에서 가져옴

// --- 특이사항 리스트 (IssueList) 🌟 화면 고정 & 내부 스크롤 완벽 적용 ---
const IssueList = ({ issues = [], isLoading = false, onReload, savedFilters, setSavedFilters, userProfile }) => {
    const [activeModalRow, setActiveModalRow] = useState(null);
    const [activeHandleRow, setActiveHandleRow] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [draftFilters, setDraftFilters] = useState({ ...savedFilters });

    useEffect(() => { setDraftFilters({ ...savedFilters }); }, [savedFilters]);
    const handleSearch = () => { setSavedFilters({ ...draftFilters }); };

    const MultiSelect = ({ label, options, selected, onChange }) => {
        const [isOpen, setIsOpen] = useState(false);
        const toggleOption = (opt) => {
            if (opt === '전체') {
                onChange('전체');
            } else {
                let currentArr = Array.isArray(selected) ? selected : (selected === '전체' ? [] : [selected]);
                const newSelected = currentArr.includes(opt) ? currentArr.filter(s => s !== opt) : [...currentArr, opt];
                onChange(newSelected.length === 0 ? '전체' : newSelected);
            }
        };

        const currentArr = Array.isArray(selected) ? selected : (selected === '전체' ? [] : [selected]);

        return (
            <div className="flex items-center shrink-0">
                <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">{label}</label>
                <div className="relative">
                    <div onClick={() => setIsOpen(!isOpen)} className="border border-gray-200 rounded-[3px] bg-white px-2.5 h-[30px] w-32 flex items-center justify-between cursor-pointer hover:border-letusBlue transition-all text-xs">
                        <span className="truncate text-gray-700 font-medium">
                            {currentArr.length === 0 ? '전체' : `${currentArr[0]}${currentArr.length > 1 ? ` 외 ${currentArr.length - 1}` : ''}`}
                        </span>
                        <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                            <div className="absolute top-[105%] left-0 w-48 bg-white border border-gray-200 rounded shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto custom-scrollbar slide-up">
                                <div onClick={() => { toggleOption('전체'); setIsOpen(false); }} className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${currentArr.length === 0 ? 'text-letusBlue font-bold' : 'text-gray-600'}`}>
                                    <input type="checkbox" readOnly checked={currentArr.length === 0} className="w-3.5 h-3.5 accent-letusBlue" /> 전체
                                </div>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {options.map(opt => (
                                    <div key={opt} onClick={() => toggleOption(opt)} className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${currentArr.includes(opt) ? 'text-letusBlue font-bold bg-blue-50/30' : 'text-gray-600'}`}>
                                        <input type="checkbox" readOnly checked={currentArr.includes(opt)} className="w-3.5 h-3.5 accent-letusBlue" /> {opt}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            const filterBrands = Array.isArray(savedFilters.brand) ? savedFilters.brand : (savedFilters.brand === '전체' ? [] : [savedFilters.brand]);
            const filterStatus = Array.isArray(savedFilters.status) ? savedFilters.status : (savedFilters.status === '전체' ? [] : [savedFilters.status]);
            if (filterBrands.length > 0 && !filterBrands.includes(issue.brand)) return false;
            if (filterStatus.length > 0 && !filterStatus.includes(issue.status)) return false;
            if (issue.created_at) {
                const issueDate = issue.created_at.split('T')[0];
                if (issueDate < savedFilters.startDate || issueDate > savedFilters.endDate) return false;
            }
            if (savedFilters.searchValue) {
                const val = savedFilters.searchValue.toLowerCase();
                if (savedFilters.searchType === '품목코드' && !issue.product_code?.toLowerCase().includes(val)) return false;
                if (savedFilters.searchType === '공급업체' && !(issue.vendor || issue.brand || '').toLowerCase().includes(val)) return false;
                if (savedFilters.searchType === '처리자' && !issue.final_handler?.toLowerCase().includes(val)) return false;
            }
            return true;
        });
    }, [issues, savedFilters]);

    const sortedIssues = useMemo(() => {
        let items = [...filteredIssues];
        if (sortConfig.key && sortConfig.direction !== 'none') {
            items.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredIssues, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') direction = 'desc';
            else if (sortConfig.direction === 'desc') direction = 'none';
        }
        setSortConfig({ key: direction === 'none' ? null : key, direction });
    };

    const handleSendFeedback = async () => { /* 기존 로직과 동일 */
        if (selectedIds.length === 0) return alert('피드백을 전송할 항목을 1개 이상 선택해 주세요.');
        const invalidItems = issues.filter(i => selectedIds.includes(i.id) && i.status !== '조치완료');
        if (invalidItems.length > 0) return alert(`⚠️ 전송 실패\n'조치완료' 상태인 항목만 전송 가능합니다.`);
        if (!window.confirm(`선택하신 ${selectedIds.length}건의 피드백을 전송하시겠습니까?`)) return;
        setIsSendingFeedback(true);
        try {
            const { error } = await supabase.from('logistics_issues').update({ is_notified: true, feedback_sent_at: new Date().toISOString() }).in('id', selectedIds);
            if (error) throw error;
            alert(`✅ ${selectedIds.length}건의 피드백 전송이 완료되었습니다.`);
            setSelectedIds([]);
            await onReload();
        } catch (err) { alert('피드백 전송 중 오류 발생'); } finally { setIsSendingFeedback(false); }
    };

    const handleRevertSelectedIssues = async () => { /* 기존 로직과 동일 */
        if (selectedIds.length === 0) return alert('원복할 항목을 선택해 주세요.');
        if (userProfile?.role === '사용자') return alert('이 작업은 관리자만 수행할 수 있습니다.');
        if (!window.confirm(`선택하신 ${selectedIds.length}건의 이슈를 '조치대기' 상태로 원복하시겠습니까?`)) return;
        try {
            const { error } = await supabase.from('logistics_issues').update({ status: '조치대기', final_handler: '', action_content: '', resolved_at: null, is_notified: false, feedback_sent_at: null }).in('id', selectedIds);
            if (error) throw error;
            alert('초기화되었습니다.');
            setSelectedIds([]);
            await onReload();
        } catch (err) { alert('오류 발생'); }
    };

    const handleSelectAll = (e) => setSelectedIds(e.target.checked ? sortedIssues.map(i => i.id) : []);
    const handleSelectOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        if (sortConfig.direction === 'asc') return <span className="ml-1 text-letusBlue font-black">↑</span>;
        if (sortConfig.direction === 'desc') return <span className="ml-1 text-letusBlue font-black">↓</span>;
        return null;
    };

    const handleExportExcel = () => {
        if (sortedIssues.length === 0) return alert('데이터가 없습니다.');

        // 엑셀 시트에 들어갈 JSON 데이터 배열 생성
        const excelData = sortedIssues.map(row => ({
            '접수번호': row.reception_no || '',
            '소속 브랜드': row.brand || '',
            '품목코드': row.product_code || '',
            '유형': row.issue_type || '',
            '접수자': row.reporter || '',
            '공급업체': row.vendor || '',
            '처리상태': row.status || '',
            '요청내용': row.request_content || '',
            '처리내용': row.action_content || '',
            '최종 처리자': row.final_handler || '',
            '최종 처리일시': formatDateTime(row.resolved_at) || ''
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 12 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "특이사항_LIST");
        XLSX.writeFile(wb, `특이사항_LIST_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        // 🔥 포인트 1: min-h-[] 대신 h-[]를 사용하여 브라우저 창 크기로 컴포넌트 높이를 강력하게 고정!
        <div className="p-6 bg-slate-100 h-[calc(100vh-64px)] flex flex-col gap-4 slide-up">

            <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 px-6 h-[54px] flex items-center z-30 shrink-0">
                <div className="flex items-center gap-6 w-full">
                    <MultiSelect label="브랜드" options={['퍼시스', '일룸', '슬로우베드', '데스커', '시디즈', '알로소']} selected={draftFilters.brand} onChange={(val) => setDraftFilters({ ...draftFilters, brand: val })} />
                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">등록일자</label>
                        <div className="flex items-center">
                            <input type="date" value={draftFilters.startDate} onChange={e => setDraftFilters({ ...draftFilters, startDate: e.target.value })} className="border border-gray-200 rounded-[3px] text-xs px-2 h-[30px] w-[110px] focus:outline-none focus:border-letusBlue" />
                            <span className="mx-1 text-gray-400 text-xs">~</span>
                            <input type="date" value={draftFilters.endDate} onChange={e => setDraftFilters({ ...draftFilters, endDate: e.target.value })} className="border border-gray-200 rounded-[3px] text-xs px-2 h-[30px] w-[110px] focus:outline-none focus:border-letusBlue" />
                        </div>
                    </div>
                    <MultiSelect label="처리상태" options={['조치대기', '처리 중', '조치완료']} selected={draftFilters.status} onChange={(val) => setDraftFilters({ ...draftFilters, status: val })} />
                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">검색어</label>
                        <div className="flex gap-0.5 h-[30px]">
                            <select value={draftFilters.searchType} onChange={e => setDraftFilters({ ...draftFilters, searchType: e.target.value })} className="border border-gray-200 rounded-l-[3px] text-xs px-2 text-gray-700 bg-gray-50 focus:outline-none">
                                <option>품목코드</option><option>공급업체</option><option>처리자</option>
                            </select>
                            <input type="text" value={draftFilters.searchValue} onChange={e => setDraftFilters({ ...draftFilters, searchValue: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="border border-gray-200 rounded-r-[3px] text-xs px-2.5 w-32 focus:outline-none focus:border-letusOrange" placeholder="검색어 입력" />
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => { const todayStr = new Date().toISOString().split('T')[0]; setDraftFilters({ brand: '전체', status: '전체', startDate: todayStr, endDate: todayStr, searchType: '품목코드', searchValue: '' }); setSavedFilters({ brand: '전체', status: '전체', startDate: todayStr, endDate: todayStr, searchType: '품목코드', searchValue: '' }); }} className="border border-gray-300 text-gray-500 hover:bg-gray-50 font-bold px-4 h-[30px] rounded-[3px] text-xs transition-colors">초기화</button>
                        <button onClick={handleSearch} className="bg-letusOrange text-white hover:bg-orange-500 font-bold px-6 h-[30px] rounded-[3px] text-xs shadow-sm transition-all flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> 조회하기
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 z-30 px-2 -mb-2 shrink-0">
                <div className="relative group">
                    <button className="flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50 min-w-[100px] justify-between shadow-sm transition-all">
                        <span>선택실행</span><svg className="w-3.5 h-3.5 ml-2 text-slate-400 group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className="absolute right-0 top-[110%] w-[130px] hidden group-hover:block z-50">
                        <div className="bg-white border border-slate-200 rounded-md shadow-xl p-1.5 flex flex-col gap-0.5">
                            <button onClick={handleExportExcel} className="w-full text-left px-2.5 py-2 text-green-700 hover:text-green-800 hover:bg-green-50 font-bold rounded text-[11px] flex items-center justify-between transition-colors">엑셀 추출 <svg className="w-3.5 h-3.5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M21.17 3.25q.33 0 .59.25q.24.26.24.59v15.82q0 .33-.24.59q-.26.25-.59.25H2.83q-.33 0-.59-.25q-.24-.26-.24-.59V4.09q0-.33.24-.59q.26-.25.59-.25h18.34zm-8.25 10.9l3.52 4.67h2.7l-4.9-6.07 4.65-5.94h-2.65l-3.23 4.48-3.32-4.48H7.07l4.76 5.94-5 6.07h2.72l3.37-4.67z" /></svg></button>
                            <div className="h-px bg-slate-100 my-0.5"></div>
                            <button onClick={handleRevertSelectedIssues} className="w-full text-left px-2.5 py-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 font-bold rounded text-[11px] transition-colors">원복</button>
                            <button onClick={handleSendFeedback} disabled={isSendingFeedback} className={`w-full text-left px-2.5 py-2 font-bold rounded text-[11px] transition-colors ${isSendingFeedback ? 'text-gray-400 cursor-not-allowed bg-gray-50' : 'text-slate-600 hover:text-letusBlue hover:bg-blue-50'}`}>{isSendingFeedback ? '전송 중...' : '피드백 전송'}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 포인트 2: min-h-0 속성 추가! 남은 공간만 꽉 채우고 표가 부모를 뚫고 나가지 못하게 막습니다. */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 relative z-20">
                {/* 🔥 포인트 3: h-[600px] 제거! 부모 컨테이너에 맞춰서 자동으로 스크롤바가 생깁니다. */}
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap table-fixed min-w-[1480px]">
                        {/* 헤더는 sticky top-0으로 고정 */}
                        <thead className="bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 text-xs text-gray-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[60px] text-center"><input type="checkbox" checked={sortedIssues.length > 0 && selectedIds.length === sortedIssues.length} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" /></th>
                                {[{ label: '접수번호', key: 'reception_no', w: '200px' }, { label: '소속 브랜드', key: 'brand', w: '100px' }, { label: '품목코드', key: 'product_code', w: 'auto' }, { label: '유형', key: 'issue_type', w: '160px' }, { label: '접수자', key: 'reporter', w: '90px' }, { label: '공급업체', key: 'vendor', w: '120px' }, { label: '처리상태', key: 'status', w: '100px' }, { label: '알림톡', key: 'is_notified', w: '80px' }, { label: '요청내용', key: null, w: '110px' }, { label: '처리 내용', key: null, w: '110px' }, { label: '최종 처리자', key: 'final_handler', w: '120px' }, { label: '최종 처리일시', key: 'resolved_at', w: '150px' }].map((col, idx) => (
                                    <th key={idx} className={`p-4 text-center select-none ${col.key ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`} style={{ width: col.w }} onClick={() => col.key && requestSort(col.key)}>
                                        <div className="flex items-center justify-center">{col.label} {col.key && getSortIcon(col.key)}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[13px]">
                            {/* 🔥 로딩 중일 때 colSpan="13"으로 전체 너비 차지 & 정중앙 정렬! */}
                            {isLoading ? (
                                <tr>
                                    <td colSpan="13" className="py-32 text-center align-middle">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-100 border-t-letusBlue rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold text-[13px]">데이터를 불러오는 중입니다...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedIssues.length === 0 ? (
                                <tr><td colSpan="13" className="p-20 text-center text-gray-400 font-bold">조회 결과가 없습니다.</td></tr>
                            ) : sortedIssues.map((row) => (
                                <tr key={row.id} className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selectedIds.includes(row.id) ? 'bg-blue-50/50' : ''}`} onClick={() => handleSelectOne(row.id)}>
                                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelectOne(row.id)} className="w-4 h-4 cursor-pointer" /></td>
                                    <td className="p-4 pl-6 font-bold text-gray-800">{row.reception_no}</td>
                                    <td className="p-4 font-semibold text-gray-700">{row.brand}</td>
                                    <td className="p-4 text-gray-600 truncate max-w-[200px]" title={row.product_code}>{row.product_code}</td>
                                    <td className="p-4"><CategoryBadge category={row.issue_type} /></td>
                                    <td className="p-4 text-gray-600">{row.reporter || '물류담당자'}</td>
                                    <td className="p-4 text-gray-700 font-semibold">{row.vendor || '-'}</td>
                                    <td className="p-4 text-center"><StatusBadge status={row.status} category={row.issue_type} /></td>
                                    <td className="p-4 text-center">{row.is_notified ? (<div className="flex justify-center"><span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 border border-blue-200 rounded-full shadow-sm" title={`전송완료: ${formatDateTime(row.feedback_sent_at)}`}><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span></div>) : <span className="text-gray-300 font-bold">-</span>}</td>
                                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setActiveModalRow(row)} className={`text-xs font-bold border px-3 py-1.5 rounded transition-colors shadow-sm w-[76px] ${row.status === '조치대기' ? 'bg-gray-50 text-gray-500' : 'bg-white text-letusBlue border-blue-200 hover:bg-blue-50'}`}>{row.status === '조치대기' ? '요청등록' : '요청확인'}</button></td>
                                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}>{['처리 중', '조치완료'].includes(row.status) ? (<button onClick={() => setActiveHandleRow(row)} className={`text-xs font-bold border px-3 py-1.5 rounded transition-colors shadow-sm w-[76px] ${row.status === '조치완료' ? 'bg-white text-green-600 border-green-200 hover:bg-green-50' : 'bg-yellow-50 text-yellow-600 border-yellow-300 hover:bg-yellow-100'}`}>{row.status === '조치완료' ? '조치 확인' : '조치 등록'}</button>) : <span className="text-gray-300">-</span>}</td>
                                    <td className="p-4 text-gray-600 font-medium">{row.final_handler || '-'}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">{formatDateTime(row.resolved_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {activeModalRow && <RequestModal row={activeModalRow} onClose={() => setActiveModalRow(null)} onReload={onReload} userProfile={userProfile} />}
            {activeHandleRow && <HandleModal row={activeHandleRow} onClose={() => setActiveHandleRow(null)} onReload={onReload} userProfile={userProfile} />}
        </div>
    );
};

window.IssueList = IssueList;