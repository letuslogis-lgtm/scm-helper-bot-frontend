const { useState, useEffect, useMemo } = React;

// ✖️ 공통 닫기 아이콘
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- 🏷️ 0. 담당 브랜드 및 업무 선택 모달 ---
const BrandTaskSelectModal = ({ initialBrands, onApplyBrands, initialTasks, onApplyTasks, onClose }) => {
    const [selectedBrands, setSelectedBrands] = useState(initialBrands ? initialBrands.split(',').map(b => b.trim()).filter(Boolean) : []);
    const [selectedTasks, setSelectedTasks] = useState(initialTasks ? initialTasks.split(',').map(t => t.trim()).filter(Boolean) : []);

    const brandList = ['전체', '퍼시스', '일룸', '슬로우베드', '데스커', '시디즈', '알로소', '바로스'];
    const taskList = ['총괄 운영', '상/하차', '피킹', '입고', '반품', '연기'];

    const toggleBrand = (brand) => {
        if (brand === '전체') {
            setSelectedBrands(selectedBrands.includes('전체') ? [] : ['전체']);
        } else {
            let newBrands = selectedBrands.includes('전체') ? [] : [...selectedBrands];
            if (newBrands.includes(brand)) newBrands = newBrands.filter(b => b !== brand);
            else newBrands.push(brand);
            setSelectedBrands(newBrands);
        }
    };

    const toggleTask = (task) => {
        setSelectedTasks(prev => prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]);
    };

    const handleApply = () => {
        onApplyBrands(selectedBrands.join(', '));
        onApplyTasks(selectedTasks.join(', '));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col slide-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center">
                        <span className="w-1.5 h-3.5 bg-letusBlue rounded-full mr-2"></span>담당 브랜드 및 업무 선택
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><CloseIcon /></button>
                </div>

                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                            <span className="text-orange-500">🏷️</span> 담당 브랜드 (다중 선택 가능)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {brandList.map(b => (
                                <button key={b} onClick={() => toggleBrand(b)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedBrands.includes(b) ? 'bg-orange-50 text-letusOrange border-orange-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-5">
                        <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                            <span className="text-blue-500">⚙️</span> 담당 업무 (다중 선택 가능)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {taskList.map(t => (
                                <button key={t} onClick={() => toggleTask(t)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedTasks.includes(t) ? 'bg-blue-50 text-letusBlue border-blue-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors">취소</button>
                    <button onClick={handleApply} className="px-5 py-2 bg-letusBlue text-white text-[11px] font-bold rounded hover:bg-blue-600 transition-colors">적용하기</button>
                </div>
            </div>
        </div>
    );
};

// --- ➕ 1. 근무자 단건 등록 모달 ---
const WorkerAddModal = ({ vendorList, onClose, onReload }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [companyType, setCompanyType] = useState('사내협력사');
    const [vendorName, setVendorName] = useState('');
    const [empType, setEmpType] = useState('현장직');
    const [workplace, setWorkplace] = useState('');
    const [managedBrand, setManagedBrand] = useState('');
    const [task, setTask] = useState('');
    const [supportStatus, setSupportStatus] = useState('미지원'); // 🔥 기본값 세팅
    const [status, setStatus] = useState('재직');

    const [brandTaskModalOpen, setBrandTaskModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        if (!name) { setErrorMsg('이름을 입력해 주세요.'); return; }

        setIsSaving(true);
        try {
            const { error } = await supabaseClient.from('workers').insert([{
                name, phone, company_type: companyType, vendor_name: vendorName,
                employment_type: empType, workplace, managed_brand: managedBrand, task, support_status: supportStatus, status
            }]);

            if (error) throw error;

            alert('신규 근무자가 성공적으로 등록되었습니다.');
            onReload();
            onClose();
        } catch (error) {
            setErrorMsg(`등록 실패: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col slide-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center">
                        <span className="w-1.5 h-3.5 bg-letusOrange rounded-full mr-2"></span>근무자 추가
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1"><CloseIcon /></button>
                </div>

                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <form id="addForm" onSubmit={handleSave} className="space-y-4">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded border border-red-100 flex items-center gap-1.5">
                                {errorMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">이름 <span className="text-red-500">*</span></label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" placeholder="홍길동" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">연락처</label>
                                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" placeholder="010-0000-0000" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">소속 구분 <span className="text-red-500">*</span></label>
                                <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="사내협력사">사내협력사</option>
                                    <option value="외주도급사">외주도급사</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">업체명 <span className="text-red-500">*</span></label>
                                <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" placeholder="업체명 입력" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근무지</label>
                                <select value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="">선택 안함</option>
                                    <option value="양지1센터">양지1센터</option>
                                    <option value="양지2센터">양지2센터</option>
                                    <option value="양지3센터">양지3센터</option>
                                    <option value="안성센터">안성센터</option>
                                    <option value="평택센터">평택센터</option>
                                    <option value="음성센터">음성센터</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근로 형태</label>
                                <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="현장직">현장직</option>
                                    <option value="사무직">사무직</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700">담당 브랜드 및 업무 관리</label>
                            <div className="min-h-[64px] border border-gray-300 rounded bg-white px-3 py-2.5 flex flex-col gap-2.5">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] font-black text-orange-400 bg-orange-50 px-1 rounded">BRAND</span>
                                    {managedBrand ? managedBrand.split(',').filter(Boolean).map((b, i) => (
                                        <span key={i} className="bg-orange-50 text-letusOrange border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{b.trim()}</span>
                                    )) : <span className="text-gray-300 text-[10px]">미설정</span>}
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] font-black text-blue-400 bg-blue-50 px-1 rounded">TASK</span>
                                    {task ? task.split(',').filter(Boolean).map((t, i) => (
                                        <span key={i} className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.trim()}</span>
                                    )) : <span className="text-gray-300 text-[10px]">미설정</span>}
                                </div>
                            </div>
                            <button type="button" onClick={() => setBrandTaskModalOpen(true)} className="flex items-center gap-1 text-[11px] font-bold text-letusBlue bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded px-3 py-1.5 transition-colors w-fit mt-0.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                브랜드/업무 선택 및 추가
                            </button>
                        </div>

                        {/* 🔥 신규 UI: 동적 지원 여부 드롭다운 */}
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-3 mt-1">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">지원 여부</label>
                                <select value={supportStatus} onChange={(e) => setSupportStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-green-500 bg-white cursor-pointer w-full text-gray-700">
                                    <option value="미지원">미지원</option>
                                    {vendorList.map(vendor => (
                                        <option key={vendor} value={vendor}>{vendor} (지원)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근무 상태</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer w-full">
                                    <option value="재직">재직</option>
                                    <option value="휴직">휴직</option>
                                    <option value="퇴사">퇴사</option>
                                </select>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors">취소</button>
                    <button onClick={handleSave} disabled={isSaving} className={`px-5 py-2 bg-letusBlue text-white text-[11px] font-bold rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {isSaving ? '등록 중...' : '등록하기'}
                    </button>
                </div>
            </div>

            {brandTaskModalOpen && (
                <BrandTaskSelectModal
                    initialBrands={managedBrand} onApplyBrands={setManagedBrand}
                    initialTasks={task} onApplyTasks={setTask}
                    onClose={() => setBrandTaskModalOpen(false)}
                />
            )}
        </div>
    );
};

// --- ✏️ 2. 근무자 단건 수정 모달 (저장 버그 수정!) ---
const WorkerEditModal = ({ worker, vendorList, onClose, onReload }) => {
    const [name, setName] = useState(worker?.name || '');
    const [phone, setPhone] = useState(worker?.phone || '');
    const [companyType, setCompanyType] = useState(worker?.company_type || '사내협력사');
    const [vendorName, setVendorName] = useState(worker?.vendor_name || '');
    const [empType, setEmpType] = useState(worker?.employment_type || '현장직');
    const [workplace, setWorkplace] = useState(worker?.workplace || '');
    const [managedBrand, setManagedBrand] = useState(worker?.managed_brand || '');
    const [task, setTask] = useState(worker?.task || '');
    const [supportStatus, setSupportStatus] = useState(worker?.support_status || '미지원');
    const [status, setStatus] = useState(worker?.status || '재직');

    const [brandTaskModalOpen, setBrandTaskModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        if (!name) { setErrorMsg('이름은 필수 입력 항목입니다.'); return; }
        if (!worker || !worker.id) { setErrorMsg('근무자 고유 ID를 찾을 수 없습니다.'); return; }

        setIsSaving(true);
        try {
            // 🚨 1. 콘솔에 엑스레이 로그 찍기 (F12 눌러서 확인 가능)
            console.log("🛠️ [수정 시도] 타겟 ID:", worker.id);
            const updatePayload = {
                name, phone, company_type: companyType, vendor_name: vendorName,
                employment_type: empType, workplace, managed_brand: managedBrand, task, support_status: supportStatus, status
            };
            console.log("🛠️ [수정 시도] 보낼 데이터:", updatePayload);

            // 🚨 2. .select()를 붙여서 진짜로 데이터가 바뀌고 돌아왔는지 확인!
            const { data, error } = await supabaseClient.from('workers').update(updatePayload).eq('id', worker.id).select();

            console.log("🛠️ [수정 결과] 반환된 데이터:", data);

            if (error) {
                console.error("DB 에러 상세:", error);
                throw error;
            }

            // 🚨 3. 에러는 안 났지만 업데이트된 데이터가 0개일 경우 (여기에 걸릴 확률 99%)
            if (!data || data.length === 0) {
                alert(`❌ 경고: 저장 처리는 돌았지만 실제 DB 값이 변하지 않았습니다!\n\n(F12 콘솔창의 [수정 시도] 로그를 복사해서 알려주세요!)`);
                setIsSaving(false);
                return;
            }

            alert('근무자 정보가 성공적으로 수정되었습니다.');
            onReload();
            onClose();
        } catch (error) {
            console.error("Worker Update Error:", error);
            setErrorMsg(`수정 실패: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col slide-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center">
                        <span className="w-1.5 h-3.5 bg-letusBlue rounded-full mr-2"></span>근무자 정보 수정
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1"><CloseIcon /></button>
                </div>

                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-4">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded border border-red-100 flex items-center gap-1.5">
                                {errorMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">이름 <span className="text-red-500">*</span></label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">연락처</label>
                                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">소속 구분 <span className="text-red-500">*</span></label>
                                <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="사내협력사">사내협력사</option>
                                    <option value="외주도급사">외주도급사</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">업체명 <span className="text-red-500">*</span></label>
                                <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근무지</label>
                                <select value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="">선택 안함</option>
                                    <option value="양지1센터">양지1센터</option>
                                    <option value="양지2센터">양지2센터</option>
                                    <option value="양지3센터">양지3센터</option>
                                    <option value="안성센터">안성센터</option>
                                    <option value="평택센터">평택센터</option>
                                    <option value="음성센터">음성센터</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근로 형태</label>
                                <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="현장직">현장직</option>
                                    <option value="사무직">사무직</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700">담당 브랜드 및 업무 관리</label>
                            <div className="min-h-[64px] border border-gray-300 rounded bg-white px-3 py-2.5 flex flex-col gap-2.5">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] font-black text-orange-400 bg-orange-50 px-1 rounded">BRAND</span>
                                    {managedBrand ? managedBrand.split(',').filter(Boolean).map((b, i) => (
                                        <span key={i} className="bg-orange-50 text-letusOrange border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{b.trim()}</span>
                                    )) : <span className="text-gray-300 text-[10px]">미설정</span>}
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] font-black text-blue-400 bg-blue-50 px-1 rounded">TASK</span>
                                    {task ? task.split(',').filter(Boolean).map((t, i) => (
                                        <span key={i} className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.trim()}</span>
                                    )) : <span className="text-gray-300 text-[10px]">미설정</span>}
                                </div>
                            </div>
                            <button type="button" onClick={() => setBrandTaskModalOpen(true)} className="flex items-center gap-1 text-[11px] font-bold text-letusBlue bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded px-3 py-1.5 transition-colors w-fit mt-0.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                브랜드/업무 선택 및 추가
                            </button>
                        </div>

                        {/* 🔥 신규 UI: 동적 지원 여부 드롭다운 */}
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-3 mt-1">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">지원 여부</label>
                                <select value={supportStatus} onChange={(e) => setSupportStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-green-500 bg-white cursor-pointer w-full text-gray-700">
                                    <option value="미지원">미지원</option>
                                    {vendorList.map(vendor => (
                                        <option key={vendor} value={vendor}>{vendor} (지원)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근무 상태</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer w-full">
                                    <option value="재직">재직</option>
                                    <option value="휴직">휴직</option>
                                    <option value="퇴사">퇴사</option>
                                </select>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors">취소</button>
                    <button onClick={handleSave} disabled={isSaving} className={`px-5 py-2 bg-letusBlue text-white text-[11px] font-bold rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {isSaving ? '수정 중...' : '수정하기'}
                    </button>
                </div>
            </div>

            {brandTaskModalOpen && (
                <BrandTaskSelectModal
                    initialBrands={managedBrand} onApplyBrands={setManagedBrand}
                    initialTasks={task} onApplyTasks={setTask}
                    onClose={() => setBrandTaskModalOpen(false)}
                />
            )}
        </div>
    );
};

// --- 📤 3. 근무자 엑셀 일괄 등록 모달 ---
const WorkerBulkUploadModal = ({ onClose, onReload }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleDownloadTemplate = () => {
        const templateData = [
            { '이름(필수)': '김철수', '연락처': '010-1234-5678', '소속구분(필수)': '사내협력사', '지원여부': '미지원', '업체명(필수)': '바로서비스', '근무지': '양지1센터', '담당브랜드': '일룸, 퍼시스', '업무': '상차', '근로형태': '현장직', '상태': '재직' }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "근무자업로드양식");
        XLSX.writeFile(wb, `근무자_일괄등록양식_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.name.includes('.xls')) setFile(selected);
        else { alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'); e.target.value = null; }
    };

    const handleUpload = async () => {
        if (!file) return alert('업로드할 엑셀 파일을 선택해 주세요.');
        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                let wb = XLSX.read(data, { type: 'binary' });
                let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

                if (rows.length === 0) throw new Error('엑셀에 데이터가 없습니다.');

                const standardData = [];
                rows.forEach(row => {
                    const cleanRow = {};
                    for (let key in row) cleanRow[key.replace(/\s/g, '')] = row[key];

                    if (!cleanRow['이름(필수)'] || !cleanRow['소속구분(필수)'] || !cleanRow['업체명(필수)']) return;

                    standardData.push({
                        name: cleanRow['이름(필수)'],
                        phone: cleanRow['연락처'] || '',
                        company_type: cleanRow['소속구분(필수)'],
                        support_status: cleanRow['지원여부'] || '미지원',
                        vendor_name: cleanRow['업체명(필수)'],
                        workplace: cleanRow['근무지'] || '',
                        managed_brand: cleanRow['담당브랜드'] || '',
                        task: cleanRow['업무'] || '',
                        employment_type: cleanRow['근로형태'] || '현장직',
                        status: cleanRow['상태'] || '재직'
                    });
                });

                if (standardData.length === 0) {
                    setIsUploading(false);
                    return alert('필수 값(이름, 소속구분, 업체명)이 누락된 데이터가 있거나 양식이 잘못되었습니다.');
                }

                const { error } = await supabaseClient.from('workers').insert(standardData);
                if (error) throw error;

                alert(`🎉 총 ${standardData.length}건의 근무자 데이터가 성공적으로 등록되었습니다!`);
                if (onReload) onReload();
                onClose();

            } catch (err) { alert('업로드 중 오류 발생: ' + err.message); }
            finally { setIsUploading(false); }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col slide-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center"><span className="w-1.5 h-3.5 bg-green-500 rounded-full mr-2"></span>근무자 일괄 등록 (Excel)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><CloseIcon /></button>
                </div>
                <div className="p-6 bg-slate-50 flex-1 space-y-4">
                    <button onClick={handleDownloadTemplate} className="w-full flex justify-center gap-2 py-2.5 border border-green-500 text-green-600 text-xs font-bold rounded-lg hover:bg-green-50 shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        엑셀 업로드 양식 다운로드
                    </button>
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:font-bold file:bg-blue-50 file:text-letusBlue hover:file:bg-blue-100 border border-gray-300 rounded-lg bg-white cursor-pointer" />
                </div>
                <div className="p-4 border-t bg-white flex justify-end gap-2">
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-50">취소</button>
                    <button onClick={handleUpload} disabled={isUploading || !file} className="px-5 py-2 bg-letusBlue text-white text-[11px] font-bold rounded hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50">
                        {isUploading ? '처리 중...' : '데이터 분석 및 적용'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 🛠️ 4. 근무자 일괄 수정 모달 ---
const WorkerBulkEditModal = ({ selectedIds, workers, onClose, onReload }) => {
    const [updateTarget, setUpdateTarget] = useState({ vendor: false, status: false });
    const [companyType, setCompanyType] = useState('사내협력사');
    const [vendorName, setVendorName] = useState('');
    const [status, setStatus] = useState('재직');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!updateTarget.vendor && !updateTarget.status) return alert('변경할 대상을 체크해 주세요.');
        if (updateTarget.vendor && !vendorName) return alert('변경할 소속 업체를 입력해 주세요.');

        setIsSaving(true);
        try {
            const updateData = {};
            if (updateTarget.vendor) {
                updateData.company_type = companyType;
                updateData.vendor_name = vendorName;
            }
            if (updateTarget.status) {
                updateData.status = status;
            }

            const { error } = await supabaseClient.from('workers').update(updateData).in('id', selectedIds);
            if (error) throw error;

            alert(`총 ${selectedIds.length}명의 근무자 정보가 일괄 수정되었습니다.`);
            onReload();
            onClose();
        } catch (err) {
            alert('일괄 수정 중 오류 발생: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[450px] overflow-hidden flex flex-col slide-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center"><span className="w-1.5 h-3.5 bg-letusBlue rounded-full mr-2"></span>선택 근무자 일괄 수정</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><CloseIcon /></button>
                </div>
                <div className="p-6 bg-slate-50 flex-1 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs font-bold text-letusBlue text-center">
                        현재 <span className="text-lg mx-1">{selectedIds.length}</span>명의 근무자가 선택되었습니다.
                    </div>

                    <div className="space-y-4">
                        <div className={`border rounded-lg p-4 transition-colors ${updateTarget.vendor ? 'border-letusBlue bg-white shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 text-sm mb-3">
                                <input type="checkbox" checked={updateTarget.vendor} onChange={e => setUpdateTarget({ ...updateTarget, vendor: e.target.checked })} className="w-4 h-4 accent-letusBlue" />
                                소속 구분 및 업체명 일괄 변경
                            </label>
                            {updateTarget.vendor && (
                                <div className="pl-6 animate-fade-in flex gap-2">
                                    <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none w-28">
                                        <option value="사내협력사">사내협력사</option>
                                        <option value="외주도급사">외주도급사</option>
                                    </select>
                                    <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none flex-1" placeholder="업체명 입력" />
                                </div>
                            )}
                        </div>

                        <div className={`border rounded-lg p-4 transition-colors ${updateTarget.status ? 'border-purple-400 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 text-sm mb-3">
                                <input type="checkbox" checked={updateTarget.status} onChange={e => setUpdateTarget({ ...updateTarget, status: e.target.checked })} className="w-4 h-4 accent-purple-500" />
                                근무 상태 일괄 덮어쓰기
                            </label>
                            {updateTarget.status && (
                                <div className="pl-6 animate-fade-in">
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none w-28 cursor-pointer">
                                        <option value="재직">재직</option>
                                        <option value="휴직">휴직</option>
                                        <option value="퇴사">퇴사</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-2">
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-50">취소</button>
                    <button onClick={handleSave} disabled={isSaving || (!updateTarget.vendor && !updateTarget.status)} className="px-5 py-2 bg-letusBlue text-white text-[11px] font-bold rounded hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50">
                        {isSaving ? '적용 중...' : '선택 대상 일괄 적용'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 👥 5. 근무자 마스터 대시보드 (메인 화면) ---
const WorkerManagement = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [workers, setWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editTarget, setEditTarget] = useState(null);

    // 조회 필터
    const [filterCompany, setFilterCompany] = useState('');
    const [filterWorkplace, setFilterWorkplace] = useState('');
    const [filterEmpType, setFilterEmpType] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');

    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    const isAllSelected = workers.length > 0 && selectedIds.length === workers.length;

    // 🔥 신규: 모달 드롭다운용 유니크 업체 리스트 추출 (DB에 있는 업체명 기준)
    const uniqueVendorList = useMemo(() => {
        const vendors = workers.map(w => w.vendor_name).filter(Boolean);
        return [...new Set(vendors)];
    }, [workers]);

    const fetchWorkers = async () => {
        setIsLoading(true);
        try {
            let query = supabaseClient.from('workers').select('*');

            if (filterCompany && filterCompany !== '전체') query = query.eq('company_type', filterCompany);
            if (filterWorkplace && filterWorkplace !== '전체') query = query.eq('workplace', filterWorkplace);
            if (filterEmpType && filterEmpType !== '전체') query = query.eq('employment_type', filterEmpType);
            if (filterKeyword) query = query.or(`name.ilike.%${filterKeyword}%,vendor_name.ilike.%${filterKeyword}%`);

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setWorkers(data || []);
        } catch (error) {
            console.error("fetchWorkers error:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, [filterCompany, filterWorkplace, filterEmpType]);

    const handleSearch = () => fetchWorkers();

    const handleExportExcel = () => {
        const targetData = selectedIds.length > 0 ? workers.filter(w => selectedIds.includes(w.id)) : workers;
        if (targetData.length === 0) return alert('추출할 데이터가 없습니다.');

        const excelData = targetData.map(row => ({
            '이름': row.name || '',
            '소속구분': row.company_type || '',
            '지원여부': row.support_status || '',
            '업체명': row.vendor_name || '',
            '근무지': row.workplace || '',
            '담당브랜드': row.managed_brand || '',
            '업무': row.task || '',
            '근로형태': row.employment_type || '',
            '연락처': row.phone || '',
            '상태': row.status || '',
            '등록일시': new Date(row.created_at).toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "근무자목록");
        XLSX.writeFile(wb, `근무자목록_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return alert('삭제할 근무자를 체크해 주세요.');
        if (!window.confirm(`선택하신 ${selectedIds.length}명의 근무자를 완전히 삭제하시겠습니까?\n(퇴사 처리는 상태 변경을 이용해주세요)`)) return;

        try {
            const { error } = await supabaseClient.from('workers').delete().in('id', selectedIds);
            if (error) throw error;

            alert(`🗑️ ${selectedIds.length}명의 데이터가 삭제되었습니다.`);
            setSelectedIds([]);
            fetchWorkers();
        } catch (err) {
            alert('삭제 중 오류 발생: ' + err.message);
        }
    };

    const toggleAll = () => setSelectedIds(isAllSelected ? [] : workers.map(w => w.id));
    const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    return (
        <div className="p-6 flex flex-col gap-4 max-w-[1600px] mx-auto animate-fade-in pb-20 w-full min-h-[calc(100vh-64px)]">
            <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-3 flex items-center z-30 shrink-0">
                <div className="flex items-center gap-5 w-full flex-wrap">

                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">소속 구분</label>
                        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="border border-gray-200 rounded-[3px] text-xs px-2.5 h-[30px] focus:outline-none focus:border-letusOrange w-28 cursor-pointer text-gray-700">
                            <option value="">전체</option>
                            <option value="사내협력사">사내협력사</option>
                            <option value="외주도급사">외주도급사</option>
                        </select>
                    </div>

                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">근무지</label>
                        <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)} className="border border-gray-200 rounded-[3px] text-xs px-2.5 h-[30px] focus:outline-none focus:border-letusOrange w-32 cursor-pointer text-gray-700">
                            <option value="">전체</option>
                            <option value="양지1센터">양지1센터</option>
                            <option value="양지2센터">양지2센터</option>
                            <option value="양지3센터">양지3센터</option>
                            <option value="안성센터">안성센터</option>
                            <option value="평택센터">평택센터</option>
                            <option value="음성센터">음성센터</option>
                        </select>
                    </div>

                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">근로 형태</label>
                        <select value={filterEmpType} onChange={e => setFilterEmpType(e.target.value)} className="border border-gray-200 rounded-[3px] text-xs px-2.5 h-[30px] focus:outline-none focus:border-letusOrange w-24 cursor-pointer text-gray-700">
                            <option value="">전체</option>
                            <option value="현장직">현장직</option>
                            <option value="사무직">사무직</option>
                        </select>
                    </div>

                    <div className="flex items-center shrink-0">
                        <label className="text-[11px] font-bold text-gray-600 mr-2 whitespace-nowrap">검색어</label>
                        <input
                            type="text" value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="이름 또는 업체명 검색..."
                            className="border border-gray-200 rounded-[3px] text-xs px-2.5 h-[30px] focus:outline-none focus:border-letusOrange w-48 text-gray-700"
                        />
                    </div>

                    <div className="ml-auto shrink-0 flex items-center gap-2">
                        <button onClick={() => { setFilterCompany(''); setFilterWorkplace(''); setFilterEmpType(''); setFilterKeyword(''); }} className="border border-gray-300 text-gray-500 hover:bg-gray-50 font-bold px-4 h-[30px] rounded-[3px] transition-colors text-xs">초기화</button>
                        <button onClick={handleSearch} className="border border-letusOrange text-letusOrange hover:bg-orange-50 font-bold px-6 h-[30px] rounded-[3px] transition-colors text-xs flex items-center justify-center">조회하기</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end w-full px-2 z-30 -mt-1 mb-1">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => setIsActionMenuOpen(!isActionMenuOpen)} className="flex items-center justify-between text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded shadow-sm px-3 py-[7px] hover:bg-gray-50 transition-all w-[90px]">
                            선택실행 <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {isActionMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsActionMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-50 py-1.5 slide-down">
                                    <button onClick={() => { setIsActionMenuOpen(false); setIsAddModalOpen(true); }} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">근무자 추가</button>
                                    <button onClick={() => { setIsActionMenuOpen(false); setIsBulkUploadModalOpen(true); }} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">엑셀 일괄 등록</button>
                                    <button onClick={() => { setIsActionMenuOpen(false); if (selectedIds.length === 0) alert('근무자를 체크해주세요.'); else setIsBulkEditModalOpen(true); }} className={`w-full text-left px-4 py-2 text-xs font-medium ${selectedIds.length > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'}`}>
                                        일괄 변경 {selectedIds.length > 0 && `(${selectedIds.length})`}
                                    </button>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button onClick={() => { setIsActionMenuOpen(false); handleExportExcel(); }} className="w-full text-left px-4 py-2 text-xs font-bold text-green-600 hover:bg-green-50 flex items-center justify-between">
                                        엑셀 추출 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </button>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button onClick={() => { setIsActionMenuOpen(false); if (selectedIds.length === 0) alert('근무자를 체크해주세요.'); else handleDeleteSelected(); }} className={`w-full text-left px-4 py-2 text-xs font-medium ${selectedIds.length > 0 ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}>
                                        영구 삭제
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden z-20">
                <div className="p-0 overflow-auto flex-1 h-[600px] custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50/70 border-b border-gray-200 text-xs text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 pl-6 w-10 text-center"><input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="w-4 h-4 accent-letusBlue cursor-pointer" /></th>
                                <th className="p-4 w-10 text-center">No</th>
                                <th className="p-4">근무자명</th>
                                <th className="p-4 text-center">소속 구분</th>
                                <th className="p-4 text-center">지원 여부</th>
                                <th className="p-4">업체명</th>
                                <th className="p-4">근무지</th>
                                <th className="p-4">담당 브랜드</th>
                                <th className="p-4">업무</th>
                                <th className="p-4 text-center">근로 형태</th>
                                <th className="p-4 text-center">연락처</th>
                                <th className="p-4 text-center">상태</th>
                            </tr>
                        </thead>
                        {isLoading ? (
                            <tbody><tr><td colSpan="12" className="text-center py-10 text-gray-400 font-bold">데이터를 불러오는 중입니다...</td></tr></tbody>
                        ) : workers.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan="12" className="p-10 text-center text-gray-400">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        <p className="font-semibold text-gray-500 mb-1">등록된 근무자가 없습니다.</p>
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
                                {workers.map((worker, idx) => (
                                    <tr key={worker.id} className={`transition-colors cursor-pointer ${selectedIds.includes(worker.id) ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`} onDoubleClick={() => setEditTarget(worker)}>
                                        <td className="p-4 pl-6 text-center"><input type="checkbox" checked={selectedIds.includes(worker.id)} onChange={() => toggleOne(worker.id)} className="w-4 h-4 accent-letusBlue cursor-pointer" /></td>
                                        <td className="p-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                                        <td className="p-4 font-black text-gray-800 text-sm">{worker.name}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${worker.company_type === '사내협력사' ? 'bg-blue-50 text-letusBlue border border-blue-100' : 'bg-orange-50 text-letusOrange border border-orange-100'}`}>
                                                {worker.company_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {/* 지원 상태 뱃지 컬러링 */}
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${worker.support_status && worker.support_status !== '미지원' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                                {worker.support_status || '미지원'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-gray-600">{worker.vendor_name}</td>
                                        <td className="p-4 font-bold text-gray-600">{worker.workplace || '-'}</td>
                                        <td className="p-4 text-gray-600 font-medium">
                                            {worker.managed_brand ? worker.managed_brand.split(',').map(b => b.trim()).filter(Boolean).map((b, i) => (
                                                <span key={i} className="inline-block bg-orange-50 text-letusOrange border border-orange-100 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 mb-1">{b}</span>
                                            )) : '-'}
                                        </td>
                                        <td className="p-4 text-gray-600 font-medium">
                                            {worker.task ? worker.task.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                                                <span key={i} className="inline-block bg-blue-50 text-letusBlue border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 mb-1">{t}</span>
                                            )) : '-'}
                                        </td>
                                        <td className="p-4 text-center text-gray-600">{worker.employment_type}</td>
                                        <td className="p-4 text-center font-mono text-gray-500">{worker.phone || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold text-[11px] shadow-sm ${worker.status === '재직' ? 'bg-green-100 text-green-700 border border-green-200' : worker.status === '휴직' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {worker.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>

            {/* 🔥 vendorList를 넘겨서 모달 안에서 업체 목록 드롭다운으로 활용! */}
            {isAddModalOpen && <WorkerAddModal vendorList={uniqueVendorList} onClose={() => setIsAddModalOpen(false)} onReload={fetchWorkers} />}
            {editTarget && <WorkerEditModal vendorList={uniqueVendorList} worker={editTarget} onClose={() => setEditTarget(null)} onReload={fetchWorkers} />}
            {isBulkUploadModalOpen && <WorkerBulkUploadModal onClose={() => setIsBulkUploadModalOpen(false)} onReload={fetchWorkers} />}
            {isBulkEditModalOpen && <WorkerBulkEditModal selectedIds={selectedIds} workers={workers} onClose={() => setIsBulkEditModalOpen(false)} onReload={fetchWorkers} />}
        </div>
    );
};

window.WorkerManagement = WorkerManagement;
