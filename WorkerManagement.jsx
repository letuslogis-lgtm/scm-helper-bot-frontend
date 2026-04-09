const { useState, useEffect, useMemo } = React;

// ✖️ 공통 닫기 아이콘
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- ➕ 1. 근무자 단건 등록 모달 ---
const WorkerAddModal = ({ onClose, onReload }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [companyType, setCompanyType] = useState('사내협력사');
    const [vendorName, setVendorName] = useState('바로서비스');
    const [empType, setEmpType] = useState('일용직');
    const [wage, setWage] = useState('');
    const [status, setStatus] = useState('재직');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!name) { setErrorMsg('이름을 입력해 주세요.'); return; }

        setIsSaving(true);
        try {
            const { error } = await supabaseClient.from('workers').insert([{
                name, phone, company_type: companyType, vendor_name: vendorName,
                employment_type: empType, hourly_wage: wage ? Number(wage) : 0, status
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
                                <label className="text-xs font-bold text-gray-700">담당 업체 <span className="text-red-500">*</span></label>
                                <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" placeholder="바로서비스" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근로 형태</label>
                                <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="정규직">정규직</option>
                                    <option value="계약직">계약직</option>
                                    <option value="일용직">일용직</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">기본 시급</label>
                                <input type="number" value={wage} onChange={(e) => setWage(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" placeholder="9860" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700">근무 상태</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer w-1/2">
                                <option value="재직">재직</option>
                                <option value="휴직">휴직</option>
                                <option value="퇴사">퇴사</option>
                            </select>
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
        </div>
    );
};

// --- ✏️ 2. 근무자 단건 수정 모달 ---
const WorkerEditModal = ({ worker, onClose, onReload }) => {
    const [name, setName] = useState(worker.name || '');
    const [phone, setPhone] = useState(worker.phone || '');
    const [companyType, setCompanyType] = useState(worker.company_type || '사내협력사');
    const [vendorName, setVendorName] = useState(worker.vendor_name || '');
    const [empType, setEmpType] = useState(worker.employment_type || '일용직');
    const [wage, setWage] = useState(worker.hourly_wage || '');
    const [status, setStatus] = useState(worker.status || '재직');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!name) { setErrorMsg('이름은 필수 입력 항목입니다.'); return; }

        setIsSaving(true);
        try {
            const { error } = await supabaseClient.from('workers').update({
                name, phone, company_type: companyType, vendor_name: vendorName,
                employment_type: empType, hourly_wage: wage ? Number(wage) : 0, status
            }).eq('id', worker.id);

            if (error) throw error;

            alert('근무자 정보가 수정되었습니다.');
            onReload();
            onClose();
        } catch (error) {
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
                                <label className="text-xs font-bold text-gray-700">담당 업체 <span className="text-red-500">*</span></label>
                                <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">근로 형태</label>
                                <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer">
                                    <option value="정규직">정규직</option>
                                    <option value="계약직">계약직</option>
                                    <option value="일용직">일용직</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-700">기본 시급</label>
                                <input type="number" value={wage} onChange={(e) => setWage(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700">근무 상태</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded px-3.5 py-2 text-xs focus:outline-none focus:border-letusBlue bg-white cursor-pointer w-1/2">
                                <option value="재직">재직</option>
                                <option value="휴직">휴직</option>
                                <option value="퇴사">퇴사</option>
                            </select>
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
        </div>
    );
};

// --- 📤 3. 근무자 엑셀 일괄 등록 모달 ---
const WorkerBulkUploadModal = ({ onClose, onReload }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleDownloadTemplate = () => {
        const templateData = [
            { '이름(필수)': '김철수', '연락처': '010-1234-5678', '소속구분(필수)': '사내협력사', '담당업체(필수)': '바로서비스', '근로형태': '일용직', '기본시급': 9860, '상태': '재직' }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
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

                    if (!cleanRow['이름(필수)'] || !cleanRow['소속구분(필수)'] || !cleanRow['담당업체(필수)']) return;

                    standardData.push({
                        name: cleanRow['이름(필수)'],
                        phone: cleanRow['연락처'] || '',
                        company_type: cleanRow['소속구분(필수)'],
                        vendor_name: cleanRow['담당업체(필수)'],
                        employment_type: cleanRow['근로형태'] || '일용직',
                        hourly_wage: cleanRow['기본시급'] ? Number(cleanRow['기본시급']) : 0,
                        status: cleanRow['상태'] || '재직'
                    });
                });

                if (standardData.length === 0) {
                    setIsUploading(false);
                    return alert('필수 값(이름, 소속구분, 담당업체)이 누락된 데이터가 있거나 양식이 잘못되었습니다.');
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
        if (updateTarget.vendor && !vendorName) return alert('변경할 담당 업체를 입력해 주세요.');

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
                                소속 및 담당 업체 일괄 변경
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

    // 필터 (상태 조회 조건 제거됨!)
    const [filterCompany, setFilterCompany] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');

    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    const isAllSelected = workers.length > 0 && selectedIds.length === workers.length;

    const fetchWorkers = async () => {
        setIsLoading(true);
        try {
            let query = supabaseClient.from('workers').select('*');

            if (filterCompany && filterCompany !== '전체') query = query.eq('company_type', filterCompany);
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
    }, [filterCompany]); // 상태 필터 의존성 제거됨

    const handleSearch = () => fetchWorkers();

    const handleExportExcel = () => {
        const targetData = selectedIds.length > 0 ? workers.filter(w => selectedIds.includes(w.id)) : workers;
        if (targetData.length === 0) return alert('추출할 데이터가 없습니다.');

        const excelData = targetData.map(row => ({
            '이름': row.name || '',
            '연락처': row.phone || '',
            '소속구분': row.company_type || '',
            '담당업체': row.vendor_name || '',
            '근로형태': row.employment_type || '',
            '기본시급': row.hourly_wage || 0,
            '상태': row.status || '',
            '등록일시': new Date(row.created_at).toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 }];

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

                    {/* 🔥 상태 검색 드롭다운이 있던 자리가 깔끔하게 사라졌습니다! */}

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
                        {/* 초기화 버튼에서도 상태 리셋 로직 제거 */}
                        <button onClick={() => { setFilterCompany(''); setFilterKeyword(''); }} className="border border-gray-300 text-gray-500 hover:bg-gray-50 font-bold px-4 h-[30px] rounded-[3px] transition-colors text-xs">초기화</button>
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
                                    <button onClick={() => { setIsActionMenuOpen(false); if (selectedIds.length === 0) alert('사용자를 체크해주세요.'); else setIsBulkEditModalOpen(true); }} className={`w-full text-left px-4 py-2 text-xs font-medium ${selectedIds.length > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'}`}>
                                        일괄 변경 {selectedIds.length > 0 && `(${selectedIds.length})`}
                                    </button>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button onClick={() => { setIsActionMenuOpen(false); handleExportExcel(); }} className="w-full text-left px-4 py-2 text-xs font-bold text-green-600 hover:bg-green-50 flex items-center justify-between">
                                        엑셀 추출 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </button>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button onClick={() => { setIsActionMenuOpen(false); if (selectedIds.length === 0) alert('사용자를 체크해주세요.'); else handleDeleteSelected(); }} className={`w-full text-left px-4 py-2 text-xs font-medium ${selectedIds.length > 0 ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}>
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
                                <th className="p-4">담당 업체</th>
                                <th className="p-4 text-center">근로 형태</th>
                                <th className="p-4 text-right">기본 시급</th>
                                <th className="p-4 text-center">연락처</th>
                                <th className="p-4 text-center">상태</th>
                            </tr>
                        </thead>
                        {isLoading ? (
                            <tbody><tr><td colSpan="9" className="text-center py-10 text-gray-400 font-bold">데이터를 불러오는 중입니다...</td></tr></tbody>
                        ) : workers.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan="9" className="p-10 text-center text-gray-400">
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
                                        <td className="p-4 font-bold text-gray-600">{worker.vendor_name}</td>
                                        <td className="p-4 text-center text-gray-600">{worker.employment_type}</td>
                                        <td className="p-4 text-right font-mono text-gray-600">{worker.hourly_wage > 0 ? worker.hourly_wage.toLocaleString() + '원' : '-'}</td>
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

            {isAddModalOpen && <WorkerAddModal onClose={() => setIsAddModalOpen(false)} onReload={fetchWorkers} />}
            {editTarget && <WorkerEditModal worker={editTarget} onClose={() => setEditTarget(null)} onReload={fetchWorkers} />}
            {isBulkUploadModalOpen && <WorkerBulkUploadModal onClose={() => setIsBulkUploadModalOpen(false)} onReload={fetchWorkers} />}
            {isBulkEditModalOpen && <WorkerBulkEditModal selectedIds={selectedIds} workers={workers} onClose={() => setIsBulkEditModalOpen(false)} onReload={fetchWorkers} />}
        </div>
    );
};

window.WorkerManagement = WorkerManagement;
