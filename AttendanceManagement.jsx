const { useState, useEffect, useMemo } = React;

const supabaseClient = window.supabase;
const { TableSkeleton, formatDateTime, Recharts } = window;

// ✖️ 공통으로 사용할 닫기 아이콘 컴포넌트
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- 📥 1. 근태 데이터 통합 업로드 모달 ---
const AttendanceUploadModal = ({ onClose, onReload }) => {
    const [files, setFiles] = useState([]);
    const [manualVendor, setManualVendor] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const detectVendor = (fileName) => {
        const nameClean = fileName.toLowerCase().replace(/\s/g, '');
        if (nameClean.includes('바로')) return '협력사_바로서비스';
        if (nameClean.includes('하나')) return '협력사_하나물류';
        if (nameClean.includes('에프스토리') || nameClean.includes('fstory')) return '협력사_에프스토리';
        if (nameClean.includes('도급사1') || nameClean.includes('IPC')) return '도급사1';
        if (nameClean.includes('도급사2') || nameClean.includes('한국사람들')) return '도급사2';
        return '';
    };

    const processFiles = (fileList) => {
        if (!fileList || fileList.length === 0) return;
        const validFiles = Array.from(fileList).filter(f => {
            const name = f.name.toLowerCase();
            return name.includes('.xls') || name.includes('.csv') || name.includes('.txt');
        });

        if (validFiles.length === 0) return alert('엑셀(.xlsx, .xls) 또는 텍스트(.csv, .txt) 파일만 가능합니다.');

        setFiles(prev => {
            const newArray = [...prev, ...validFiles];
            if (newArray.length === 1) setManualVendor(detectVendor(newArray[0].name));
            else setManualVendor('');
            return newArray;
        });
    };

    const removeFile = (indexToRemove) => {
        setFiles(prev => {
            const newArray = prev.filter((_, i) => i !== indexToRemove);
            if (newArray.length === 1) setManualVendor(detectVendor(newArray[0].name));
            else setManualVendor('');
            return newArray;
        });
    };

    const clearAllFiles = () => {
        setFiles([]);
        setManualVendor('');
    };

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const readFileAsync = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        const isTextFile = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt');
        reader.onload = e => resolve({ data: e.target.result, isTextFile });
        reader.onerror = e => reject(e);
        if (isTextFile) reader.readAsText(file, 'euc-kr');
        else reader.readAsBinaryString(file);
    });

    const handleUpload = async () => {
        if (files.length === 0) return alert('업로드할 파일을 추가해 주세요.');
        setIsUploading(true);

        let allStandardData = [];
        let successFiles = [];
        let failedFiles = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const vendorType = (files.length === 1 && manualVendor) ? manualVendor : detectVendor(file.name);

                if (!vendorType) {
                    failedFiles.push(`${file.name} (업체 인식 불가)`);
                    continue;
                }

                const { data, isTextFile } = await readFileAsync(file);
                let rows = [];

                if (isTextFile) {
                    const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
                    if (lines.length > 0) {
                        const separator = lines[0].includes('\t') ? '\t' : ',';
                        const headers = lines[0].split(separator).map(h => h.replace(/["\s]/g, ''));
                        for (let j = 1; j < lines.length; j++) {
                            const values = lines[j].split(separator);
                            const row = {};
                            headers.forEach((h, idx) => row[h] = values[idx] ? values[idx].replace(/"/g, '').trim() : '');
                            rows.push(row);
                        }
                    }
                } else {
                    let wb = XLSX.read(data, { type: 'binary' });
                    for (let j = 0; j < wb.SheetNames.length; j++) {
                        const tempRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[j]], { defval: '' });
                        if (tempRows.length > 0) { rows = tempRows; break; }
                    }
                    if (rows.length === 0 && (data.includes('<table') || data.includes('<TABLE'))) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(data, 'text/html');
                        const table = doc.querySelector('table');
                        if (table) {
                            wb = XLSX.utils.table_to_book(table);
                            rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
                        }
                    }
                }

                if (rows.length === 0) {
                    failedFiles.push(`${file.name} (데이터 없음)`);
                    continue;
                }

                const exactVendor = vendorType.replace('협력사_', '');
                const companyType = vendorType.startsWith('협력사_') ? '사내협력사' : '외주도급사';
                let parsedCount = 0;

                // 1. IPC(도급사1)는 파일 구조가 완전히 다르므로 별도로 먼저 처리합니다.
                if (vendorType === '도급사1' || vendorType === 'IPC') {
                    // 인원, 연장시간, 공제시간이 적힌 행을 각각 찾습니다.
                    const manpowerRow = rows.find(r => Object.values(r).some(v => String(v).includes('인원')));
                    const overtimeRow = rows.find(r => Object.values(r).some(v => String(v).includes('연장시간')));
                    const deductionRow = rows.find(r => Object.values(r).some(v => String(v).includes('공제시간')));

                    if (manpowerRow) {
                        // "02월 01일" 형태의 날짜 컬럼들만 필터링 (계 제외)
                        const dateColumns = Object.keys(manpowerRow).filter(key => key.includes('월') && key.includes('일'));

                        let satData = null; // 토요일 데이터를 잠시 담아둘 변수

                        dateColumns.forEach(dateCol => {
                            const manpower = parseFloat(manpowerRow[dateCol]) || 0;
                            const overtime = parseFloat(overtimeRow ? overtimeRow[dateCol] : 0) || 0;
                            const deduction = parseFloat(deductionRow ? deductionRow[dateCol] : 0) || 0;

                            if (manpower === 0 && overtime === 0) return;

                            // 요일 판별 (2026년 기준 혹은 현재 연도 기준)
                            const currentYear = new Date().getFullYear();
                            const [m, d] = dateCol.split('월').map(v => parseInt(v));
                            const dateObj = new Date(currentYear, m - 1, d);
                            const dayOfWeek = dateObj.getDay(); // 0:일, 6:토
                            const formattedDate = `${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                            // --- [특이사항 로직 적용] ---
                            // 토요일(6)이면 저장만 하고 패스
                            if (dayOfWeek === 6) {
                                satData = { manpower, overtime, deduction, date: formattedDate };
                                return;
                            }

                            // 일요일(0)이면 토요일분 합산
                            let finalManpower = manpower;
                            let finalOvertime = overtime;
                            let finalDeduction = deduction;

                            if (dayOfWeek === 0 && satData) {
                                finalManpower += satData.manpower;
                                finalOvertime += satData.overtime;
                                finalDeduction += satData.deduction;
                                satData = null; // 합산 완료 후 비움
                            }

                            // 계산식: 정상 = (인원 * 8) - 공제, 연장 = 그대로
                            const n_hours = (finalManpower * 8) - finalDeduction;
                            const o_hours = finalOvertime;

                            allStandardData.push({
                                work_date: formattedDate,
                                company_type: companyType,
                                vendor_name: 'IPC',
                                worked_vendor: 'IPC',
                                worker_name: 'IPC_통합',
                                start_time: '08:30',
                                end_time: o_hours > 0 ? 'OT발생' : '17:30',
                                work_hours: n_hours + o_hours,
                                normal_hours: n_hours,
                                overtime_hours: o_hours,
                                weighted_hours: n_hours + (o_hours * 1.5),
                                remark: `총 ${finalManpower}명 투입 (공제 ${finalDeduction}H 적용됨)`
                            });
                            parsedCount++;
                        });
                    }
                    return; // IPC 처리가 끝났으므로 아래 일반 rows.forEach는 실행하지 않음
                }
                rows.forEach(rawRow => {
                    const row = {};
                    for (let key in rawRow) row[key.replace(/\s/g, '')] = rawRow[key];

                    const dateVal = row['근무일자'] || row['날짜'] || '';
                    const nameVal = row['사원명'] || row['근로자명'] || row['구분'] || '';
                    if (!nameVal || nameVal === '계') return;

                    if (vendorType === '도급사2') {
                        const dateColumns = Object.keys(row).filter(key => key.includes('월') && key.includes('일'));
                        dateColumns.forEach(dateCol => {
                            const workValue = row[dateCol];
                            if (workValue) {
                                allStandardData.push({
                                    work_date: dateCol, company_type: companyType, vendor_name: exactVendor, worked_vendor: exactVendor,
                                    worker_name: nameVal, start_time: '', end_time: '',
                                    work_hours: 8, normal_hours: 8, overtime_hours: 0, weighted_hours: 8, remark: `기록: ${workValue}`
                                });
                                parsedCount++;
                            }
                        });
                    } else if (dateVal) {
                        let startTime = row['출근시간'] || row['출근'] || '';
                        let endTime = row['퇴근시간'] || row['퇴근'] || '';
                        let remarkStr = row['이상유무'] || row['비고'] || '';

                        let w_hours = 8, n_hours = 8, o_hours = 0, weight_hours = 8;

                        if (companyType === '사내협력사') {
                            const gubun = row['구분'] || '정상';
                            remarkStr = remarkStr ? `${gubun} / ${remarkStr}` : gubun;

                            const parseNum = (v) => {
                                if (!v) return 0;
                                const n = parseFloat(v);
                                return isNaN(n) ? 0 : n;
                            };

                            const parseMinToHour = (v) => parseNum(v) / 60;

                            const calcDiff = (start, end) => {
                                if (!start || !end) return 0;
                                const [sH, sM] = start.split(':').map(Number);
                                const [eH, eM] = end.split(':').map(Number);
                                if (isNaN(sH) || isNaN(eH)) return 0;
                                return Math.max(0, ((eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0))) / 60);
                            };

                            const p_over = parseMinToHour(row['평일연장근무'] || row['평일연장시간'] || row['평일연장']);
                            const p_night = parseMinToHour(row['평일심야근무'] || row['평일심야시간'] || row['평일심야']);
                            const h_work = parseMinToHour(row['휴일근무'] || row['휴일근무시간']);
                            const h_over = parseMinToHour(row['휴일연장근무'] || row['휴일연장시간'] || row['휴일연장']);
                            const h_night = parseMinToHour(row['휴일심야근무'] || row['휴일심야시간'] || row['휴일심야']);
                            const early = parseMinToHour(row['조기출근시간'] || row['조기출근']);
                            const lunch = parseMinToHour(row['점심근무시간'] || row['점심근무']);
                            const late = parseMinToHour(row['지각시간'] || row['지각']);
                            const leave = parseMinToHour(row['조퇴시간'] || row['조퇴']);
                            const out = parseMinToHour(row['외출시간'] || row['외출']);

                            if (!startTime && !endTime) {
                                w_hours = 0; n_hours = 0; o_hours = 0; weight_hours = 0;
                            } else {
                                if (gubun === '정상') {
                                    n_hours = Math.max(0, 8 - late - leave - out);
                                    o_hours = p_over + p_night + h_work + h_over + h_night + early;
                                    w_hours = n_hours + o_hours;
                                } else {
                                    const baseTime = calcDiff('08:30', endTime);
                                    w_hours = baseTime + early + lunch - late - leave - out;
                                    n_hours = 0;
                                    o_hours = w_hours;
                                }
                                weight_hours = w_hours + (o_hours * 1.5);
                            }
                        }

                        if (startTime || endTime || w_hours > 0) {
                            allStandardData.push({
                                work_date: dateVal.replace(/\./g, '-'), company_type: companyType, vendor_name: exactVendor, worked_vendor: exactVendor,
                                worker_name: nameVal, start_time: startTime, end_time: endTime,
                                work_hours: w_hours, normal_hours: n_hours, overtime_hours: o_hours, weighted_hours: weight_hours,
                                remark: remarkStr
                            });
                        }
                        parsedCount++;
                    }
                });

                if (parsedCount > 0) successFiles.push(file.name);
                else failedFiles.push(`${file.name} (양식 불일치)`);
            }

            if (allStandardData.length === 0) throw new Error('추출된 데이터가 0건입니다.');

            const { error } = await supabaseClient.from('worker_attendance').insert(allStandardData);
            if (error) throw error;

            let resultMsg = `🎉 총 ${allStandardData.length}건의 데이터가 일괄 등록되었습니다!\n\n`;
            resultMsg += `✅ 성공: ${successFiles.length}개 파일\n`;
            if (failedFiles.length > 0) resultMsg += `❌ 실패: ${failedFiles.length}개 파일\n(${failedFiles.join(', ')})`;

            alert(resultMsg);
            if (onReload) onReload();
            onClose();

        } catch (err) { alert('업로드 오류: ' + err.message); }
        finally { setIsUploading(false); }
    };

    const activeVendors = files.length === 1 && manualVendor
        ? [manualVendor]
        : files.map(f => detectVendor(f.name)).filter(Boolean);

    const vendorList = [
        { id: '협력사_바로서비스', label: '바로서비스' },
        { id: '협력사_하나물류', label: '하나물류' },
        { id: '협력사_에프스토리', label: '에프스토리' },
        { id: '도급사1', label: 'IPC' },
        { id: '도급사2', label: '한국사람들' },
        { id: '도급사3', label: '도급사3' }
    ];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-[600px] flex flex-col overflow-hidden slide-up">

                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>근태 데이터 통합 업로드
                    </h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><CloseIcon /></button>
                </div>

                <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-h-[80vh]">
                    <div className="bg-[#f8faff] border border-blue-100/60 rounded-xl p-5">
                        <p className="text-sm font-bold text-gray-800 mb-2.5 flex items-center gap-1.5">
                            <span className="text-yellow-500 text-base">💡</span> 파일 업로드 가이드
                        </p>
                        <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside ml-1">
                            <li>협력사 및 도급사 근태 데이터를 <span className="font-bold text-gray-800">다중 업로드</span> 할 수 있습니다.</li>
                            <li>ERP 엑셀 다운로드 파일 오류 시, <span className="font-bold text-blue-600">CSV 또는 TXT 형식</span>을 권장합니다.</li>
                            <li>파일 이름에 <span className="font-bold text-blue-600">바로서비스, 하나, IPC, 한국사람들</span> 등 업체명이 포함되어야 자동 인식됩니다.</li>
                        </ul>
                    </div>

                    <div
                        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                        className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-all min-h-[160px] ${isDragging ? 'border-letusBlue bg-blue-50/50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    >
                        <input type="file" multiple accept=".xlsx, .xls, .csv, .txt" onChange={(e) => processFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />

                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-4">
                                <svg className="w-8 h-8 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-[13px] font-bold text-gray-700">업로드할 파일들을 이곳으로 드래그 하세요</p>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col h-full z-20">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <span className="text-[12px] font-bold text-letusBlue">총 {files.length}개 파일 선택됨</span>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar space-y-2 relative z-30 pr-1">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white border border-gray-200 px-4 py-2.5 rounded-lg shadow-sm text-xs group hover:border-letusBlue/50 transition-colors">
                                            <span className="truncate w-[90%] font-bold text-gray-700 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                {f.name}
                                            </span>
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(i); }} className="text-gray-400 hover:text-red-500 transition-colors"><CloseIcon /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        {vendorList.map(vendor => {
                            const isActive = activeVendors.includes(vendor.id);
                            return (
                                <div
                                    key={vendor.id}
                                    onClick={() => { if (files.length === 1) setManualVendor(vendor.id); }}
                                    className={`relative flex items-center justify-center py-3 rounded-lg border text-[12px] font-bold transition-all ${files.length === 1 ? 'cursor-pointer hover:border-blue-300' : ''} ${isActive ? 'bg-white border-letusBlue text-letusBlue shadow-[0_0_0_1px_rgba(59,130,246,1)]' : 'bg-gray-50/50 border-gray-200 text-gray-400'}`}
                                >
                                    {vendor.label}
                                    {isActive && (
                                        <svg className="w-4 h-4 text-letusBlue ml-1.5 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {files.length === 1 && <p className="text-[10px] text-gray-400 font-bold text-right -mt-4">* 단일 파일 업로드 시 업체 수동 변경 가능</p>}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <button
                        onClick={clearAllFiles}
                        disabled={files.length === 0}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${files.length > 0 ? 'text-gray-500 hover:text-gray-800' : 'text-transparent cursor-default'}`}
                    >
                        {files.length > 0 && (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                파일 목록 비우기
                            </>
                        )}
                    </button>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">닫기</button>
                        <button onClick={handleUpload} disabled={isUploading || files.length === 0} className="px-6 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1.5">
                            {isUploading ? '데이터 분석 중...' : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    분석 및 DB 저장
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ✏️ 2. 근태/생산성: 선택 항목 일괄 수정 모달 ---
const AttendanceBulkEditModal = ({ selectedIds, onClose, onReload }) => {
    const [workedVendor, setWorkedVendor] = useState('');
    const [remark, setRemark] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!workedVendor && !remark) return alert('변경할 투입 업체나 비고 내용을 입력해 주세요.');
        if (!window.confirm(`선택하신 ${selectedIds.length}명의 근무 데이터를 일괄 수정하시겠습니까?\n(지원/파견 처리)`)) return;

        setIsSaving(true);
        try {
            const updateData = {};
            if (workedVendor) updateData.worked_vendor = workedVendor;
            if (remark) updateData.remark = remark;

            const { error } = await supabaseClient.from('worker_attendance').update(updateData).in('id', selectedIds);
            if (error) throw error;

            alert(`🎉 총 ${selectedIds.length}명의 데이터가 일괄 수정되었습니다.`);
            onReload();
            onClose();
        } catch (err) {
            alert('일괄 저장 중 오류 발생: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl z-10 w-full max-w-md slide-up overflow-hidden border border-gray-100 flex flex-col">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-letusOrange rounded-full"></span>
                        선택 인원 일괄 수정 (지원/파견)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><CloseIcon /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm font-bold text-letusBlue text-center">
                        현재 <span className="text-lg mx-1">{selectedIds.length}</span>명의 근무 데이터가 선택되었습니다.
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-bold text-gray-700 mb-2">실제 투입 업체 (지원/파견 변경 시)</label>
                            <select value={workedVendor} onChange={e => setWorkedVendor(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-letusBlue/20 focus:border-letusBlue transition-all cursor-pointer bg-white">
                                <option value="">변경 안 함 (기존 소속 유지)</option>
                                <option value="바로서비스">바로서비스</option>
                                <option value="하나물류">하나물류</option>
                                <option value="에프스토리">에프스토리</option>
                                <option value="IPC">IPC</option>
                                <option value="한국사람들">한국사람들</option>
                                <option value="JNT">JNT</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">* 선택 시 원 소속과 무관하게 해당 업체의 생산성(UPH)으로 집계됩니다.</p>
                        </div>

                        <div>
                            <label className="block text-[12px] font-bold text-gray-700 mb-2">특이사항 (비고) 일괄 적용</label>
                            <input type="text" value={remark} onChange={e => setRemark(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-letusBlue/20 focus:border-letusBlue transition-all placeholder:text-gray-300" placeholder="예: IPC 물량 증가로 인한 오후 지원" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm">취소</button>
                    <button onClick={handleSave} disabled={isSaving || (!workedVendor && !remark)} className={`px-6 py-2 bg-letusBlue text-white text-sm font-bold rounded-lg shadow hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {isSaving ? '일괄 적용 중...' : '확인 및 일괄 적용'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 👥 3. 근무자 근태 관리 대시보드 (메인 화면) ---
const AttendanceManagement = () => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [expandedVendors, setExpandedVendors] = useState([]);

    const [selectedIds, setSelectedIds] = useState([]);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    // 🔥 정렬 관련 상태값
    const [sortConfig, setSortConfig] = useState(null);

    const [tempStartDate, setTempStartDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
    const [tempEndDate, setTempEndDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`);
    const [startDate, setStartDate] = useState(tempStartDate);
    const [endDate, setEndDate] = useState(tempEndDate);

    const [tempChartStartDate, setTempChartStartDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
    const [tempChartEndDate, setTempChartEndDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`);
    const [chartStartDate, setChartStartDate] = useState(tempChartStartDate);
    const [chartEndDate, setChartEndDate] = useState(tempChartEndDate);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('전체');

    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [filterType, setFilterType] = useState('D');
    const [chartFilterType, setChartFilterType] = useState('M');

    const getFilterDates = (type) => {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (type === 'D') {
            const today = format(now);
            return { start: today, end: today };
        } else if (type === 'W') {
            const day = now.getDay();
            const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { start: format(monday), end: format(sunday) };
        } else if (type === 'M') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { start: format(firstDay), end: format(lastDay) };
        }
        return { start: tempStartDate, end: tempEndDate };
    };

    React.useEffect(() => {
        if (filterType !== 'CUSTOM') {
            const { start, end } = getFilterDates(filterType);
            setStartDate(start);
            setEndDate(end);
            setTempStartDate(start);
            setTempEndDate(end);
        } else {
            setStartDate(tempStartDate);
            setEndDate(tempEndDate);
        }
    }, [filterType]);

    React.useEffect(() => {
        if (chartFilterType !== 'CUSTOM') {
            const { start, end } = getFilterDates(chartFilterType);
            setChartStartDate(start);
            setChartEndDate(end);
            setTempChartStartDate(start);
            setTempChartEndDate(end);
        } else {
            setChartStartDate(tempChartStartDate);
            setChartEndDate(tempChartEndDate);
        }
    }, [chartFilterType]);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            let allData = [];
            let hasMore = true;
            let page = 0;
            const pageSize = 1000;

            while (hasMore) {
                const { data, error } = await supabaseClient
                    .from('worker_attendance')
                    .select('*')
                    .order('work_date', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    page++;
                    if (data.length < pageSize) hasMore = false;
                } else {
                    hasMore = false;
                }
            }

            // 🔥 출근/퇴근 시간이 없으면서 총 근무시간도 0인 "엑셀 공란 찌꺼기 데이터" 원천 차단
            const cleanData = allData.filter(row => row.start_time || row.end_time || Number(row.work_hours) > 0);
            setAttendanceData(cleanData);
        } catch (err) {
            console.error('근태 데이터 조회 실패:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAttendance();
    }, []);

    const filteredDetailData = attendanceData.filter(row => {
        const matchDate = row.work_date && row.work_date >= startDate && row.work_date <= endDate;
        const matchVendor = selectedVendor === '전체' || row.company_type === selectedVendor;
        const matchSearch = (row.worker_name && row.worker_name.includes(searchTerm)) || (row.vendor_name && row.vendor_name.includes(searchTerm));

        return matchDate && matchVendor && matchSearch;
    });

    const sortedDetailData = React.useMemo(() => {
        let sortableItems = [...filteredDetailData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'work_date' || sortConfig.key === 'go_work_time' || sortConfig.key === 'leave_work_time') {
                    aValue = new Date(aValue || 0).getTime() || 0;
                    bValue = new Date(bValue || 0).getTime() || 0;
                } else if (sortConfig.key === 'normal_hours' || sortConfig.key === 'overtime_hours' || sortConfig.key === 'work_hours') {
                    aValue = Number(aValue) || 0;
                    bValue = Number(bValue) || 0;
                } else {
                    aValue = (aValue || '').toString().toLowerCase();
                    bValue = (bValue || '').toString().toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredDetailData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const vendorSummaryMap = {};
    const chartDataMap = {};

    const filteredChartData = attendanceData.filter(row => {
        if (!row.work_date) return false;
        return row.work_date >= chartStartDate && row.work_date <= chartEndDate;
    });

    filteredChartData.forEach(row => {
        const monthStr = row.work_date ? row.work_date.substring(0, 7) : '미상';

        if (!vendorSummaryMap[row.worked_vendor]) {
            vendorSummaryMap[row.worked_vendor] = { type: row.company_type, vendor: row.worked_vendor, normal: 0, overtime: 0, total: 0, weighted: 0, monthsMap: {} };
        }

        const vMap = vendorSummaryMap[row.worked_vendor];
        const normalH = Number(row.normal_hours) || 0;
        const overH = Number(row.overtime_hours) || 0;
        const totalH = Number(row.work_hours) || 0;
        const weightedH = Number(row.weighted_hours) || 0;

        vMap.normal += normalH; vMap.overtime += overH; vMap.total += totalH; vMap.weighted += weightedH;

        if (!vMap.monthsMap[monthStr]) vMap.monthsMap[monthStr] = { month: monthStr, normal: 0, overtime: 0, total: 0, weighted: 0 };
        vMap.monthsMap[monthStr].normal += normalH; vMap.monthsMap[monthStr].overtime += overH;
        vMap.monthsMap[monthStr].total += totalH; vMap.monthsMap[monthStr].weighted += weightedH;

        if (!chartDataMap[monthStr]) chartDataMap[monthStr] = { name: monthStr, normal: 0, overtime: 0, total: 0 };
        chartDataMap[monthStr].normal += normalH; chartDataMap[monthStr].overtime += overH; chartDataMap[monthStr].total += totalH;
    });

    const summaryDataList = Object.values(vendorSummaryMap).map(v => ({
        ...v,
        months: Object.values(v.monthsMap).sort((a, b) => a.month.localeCompare(b.month))
    })).sort((a, b) => a.type === '사내협력사' ? -1 : 1);

    const chartDataList = Object.values(chartDataMap).sort((a, b) => a.name.localeCompare(b.name));

    const totalSummary = summaryDataList.reduce((acc, curr) => {
        acc.normal += curr.normal; acc.overtime += curr.overtime; acc.total += curr.total; acc.weighted += curr.weighted; return acc;
    }, { normal: 0, overtime: 0, total: 0, weighted: 0 });

    const toggleVendor = (vendor) => setExpandedVendors(prev => prev.includes(vendor) ? prev.filter(v => v !== vendor) : [...prev, vendor]);
    const handleSelectAll = (e) => setSelectedIds(e.target.checked ? filteredDetailData.map(i => i.id) : []);
    const handleSelectOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const currentViewCount = useMemo(() => {
        return activeTab === 'summary' ? filteredChartData.length : filteredDetailData.length;
    }, [activeTab, filteredChartData.length, filteredDetailData.length]);

    // 선택된 데이터를 바탕으로 지표를 실시간 계산 (IPC 통합 인원 완벽 대응)
    const currentStats = useMemo(() => {
        const targetData = activeTab === 'summary' ? filteredChartData : filteredDetailData;

        return targetData.reduce((acc, curr) => {
            // 1. 기본 인원수는 1명으로 잡되, IPC처럼 통합 데이터인 경우 비고란에서 실제 인원을 빼옵니다.
            let actualHeadcount = 1;
            if (curr.worker_name === 'IPC_통합') {
                // 정규식을 이용해 비고란("총 54명 투입...")에서 숫자만 쏙 뽑아옵니다.
                const match = curr.remark?.match(/총 (\d+)명/);
                if (match) {
                    actualHeadcount = parseInt(match[1], 10);
                }
            }

            // 2. 뽑아낸 실제 인원수를 더해줍니다. (일반 업체는 1명씩, IPC는 50명씩 더해짐)
            if (curr.company_type === '사내협력사') {
                acc.partnerCount += actualHeadcount;
            } else if (curr.company_type === '외주도급사') {
                acc.contractorCount += actualHeadcount;
            }

            // 3. 총 근무시간은 어차피 합산된 값이 들어있으므로 그대로 더합니다.
            acc.totalHours += (Number(curr.work_hours) || 0);

            return acc;
        }, { partnerCount: 0, contractorCount: 0, totalHours: 0 });
    }, [activeTab, filteredChartData, filteredDetailData]);

    return (
        <div className="p-6 bg-slate-100 min-h-[calc(100vh-64px)] slide-up flex flex-col gap-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <span className="text-letusOrange">👥</span> 근무자 근태 관리
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">협력사 및 도급사의 일일 근태를 통합 관리하고 리포트를 산출합니다.</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    근태 엑셀 업로드
                </button>
            </div>

            {/* 상단 통합 지표 영역 */}
            <div className="grid grid-cols-4 gap-4 shrink-0">

                {/* 1번 카드: 조회 기간 데이터 개수 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center relative overflow-hidden group transition-all hover:shadow-md">
                    <span className="text-xs font-bold text-gray-500 mb-1">
                        {activeTab === 'summary' ? '조회 기간 집계 데이터' : '조회 기간 상세 데이터'}
                    </span>
                    <span className="text-3xl font-black text-gray-800">
                        {currentViewCount.toLocaleString()}
                        <span className="text-sm font-bold text-gray-400 ml-1">건</span>
                    </span>
                    {/* 전체 데이터 대비 비중 표시바 */}
                    <div
                        className="absolute bottom-0 left-0 h-1 bg-letusOrange/30 transition-all duration-700 ease-out"
                        style={{ width: `${(currentViewCount / (attendanceData.length || 1)) * 100}%` }}
                    ></div>
                </div>

                {/* 2번 카드: 협력사 투입 인원 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center transition-all hover:shadow-md">
                    <span className="text-xs font-bold text-letusBlue mb-1">조회 기간 협력사 투입</span>
                    <span className="text-3xl font-black text-blue-600">
                        {currentStats.partnerCount.toLocaleString()}
                        <span className="text-sm font-bold text-blue-300 ml-1">명</span>
                    </span>
                </div>

                {/* 3번 카드: 도급사 투입 인원 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center transition-all hover:shadow-md">
                    <span className="text-xs font-bold text-orange-500 mb-1">조회 기간 도급사 투입</span>
                    <span className="text-3xl font-black text-orange-600">
                        {currentStats.contractorCount.toLocaleString()}
                        <span className="text-sm font-bold text-orange-300 ml-1">명</span>
                    </span>
                </div>

                {/* 4번 카드: 총 근무 시간 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center transition-all hover:shadow-md">
                    <span className="text-xs font-bold text-red-500 mb-1">조회 기간 총 근무시간</span>
                    <span className="text-3xl font-black text-red-600">
                        {currentStats.totalHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        <span className="text-sm font-bold text-red-300 ml-1">H</span>
                    </span>
                </div>

            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden z-20">
                <div className="flex border-b border-gray-200 bg-gray-50/50 px-4 pt-4 shrink-0">
                    <button
                        onClick={() => { setActiveTab('summary'); setSelectedIds([]); }}
                        className={`px-6 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'summary' ? 'border-letusBlue text-letusBlue bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-t-lg'}`}
                    >
                        📊 기간별 집계 현황
                    </button>
                    <button
                        onClick={() => { setActiveTab('detail'); setSelectedIds([]); }}
                        className={`px-6 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'detail' ? 'border-letusBlue text-letusBlue bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-t-lg'}`}
                    >
                        📋 일별 상세 내역 (지원/파견 관리)
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between bg-white shrink-0 gap-y-3 min-h-[70px]">
                    <div className="flex flex-wrap items-center w-full min-w-0 md:w-auto md:flex-1">
                        {activeTab === 'summary' ? (
                            <div className="flex items-center justify-end w-full gap-2">
                                {chartFilterType === 'CUSTOM' && (
                                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 animate-fade-in shadow-sm h-[38px]">
                                        <input type="date" value={tempChartStartDate} onChange={(e) => setTempChartStartDate(e.target.value)} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                                        <span className="text-gray-400 text-xs mx-1">~</span>
                                        <input type="date" value={tempChartEndDate} onChange={(e) => setTempChartEndDate(e.target.value)} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                                        <button onClick={() => { setChartStartDate(tempChartStartDate); setChartEndDate(tempChartEndDate); }} className="bg-orange-500 text-white font-bold px-3 h-full rounded text-[11px] shadow hover:bg-orange-600 transition-colors ml-1 tracking-tight">조회</button>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner h-[38px] items-center">
                                        {[{ id: 'D', name: '당일' }, { id: 'W', name: '주간' }, { id: 'M', name: '월간' }, { id: 'CUSTOM', name: '직접지정' }].map(btn => (
                                            <button key={btn.id} onClick={() => setChartFilterType(btn.id)} className={`px-3 h-full text-xs font-bold rounded-md transition-all ${chartFilterType === btn.id ? 'bg-white text-letusBlue shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}>
                                                {btn.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                    {['전체', '사내협력사', '외주도급사'].map(type => (
                                        <button key={type} onClick={() => setSelectedVendor(type)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${selectedVendor === type ? 'bg-white text-letusBlue shadow-sm ring-1 ring-letusBlue/20' : 'text-gray-500 hover:bg-gray-100'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                                <div className="flex items-center gap-2 relative">
                                    <input type="text" placeholder="사원명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border border-gray-200 rounded-lg pl-8 pr-3 py-[7px] text-xs font-bold text-gray-700 outline-none focus:border-letusBlue w-40" />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto shrink-0">
                        {activeTab === 'detail' && (
                            <div className="flex items-center gap-3">
                                {filterType === 'CUSTOM' && (
                                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 animate-fade-in shadow-sm h-[38px]">
                                        <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                                        <span className="text-gray-400 text-xs mx-0.5">~</span>
                                        <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} className="bg-transparent text-xs text-gray-700 font-bold focus:outline-none cursor-pointer px-1 w-[110px]" />
                                        <button onClick={() => { setStartDate(tempStartDate); setEndDate(tempEndDate); }} className="bg-orange-500 text-white font-bold px-3 py-1.5 h-full rounded text-[11px] shadow-sm hover:bg-blue-600 transition-colors ml-1">조회</button>
                                    </div>
                                )}

                                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner h-[38px] items-center">
                                    {[{ id: 'D', name: '당일' }, { id: 'W', name: '주간' }, { id: 'M', name: '월간' }, { id: 'CUSTOM', name: '직접지정' }].map(btn => (
                                        <button key={btn.id} onClick={() => setFilterType(btn.id)} className={`px-3 h-full text-xs font-bold rounded-md transition-all ${filterType === btn.id ? 'bg-white text-letusBlue shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}>
                                            {btn.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-6 w-px bg-gray-200 hidden md:block mx-1"></div>

                                <div className="relative z-50">
                                    <button onClick={() => setIsActionMenuOpen(!isActionMenuOpen)} className="flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded px-3 py-1.5 h-[38px] hover:bg-slate-50 min-w-[100px] justify-between shadow-sm transition-all">
                                        <span>선택실행 {selectedIds.length > 0 && `(${selectedIds.length})`}</span>
                                        <svg className={`w-3.5 h-3.5 ml-2 text-slate-400 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {isActionMenuOpen && (
                                        <>
                                            <div className="fixed inset-0" onClick={() => setIsActionMenuOpen(false)}></div>
                                            <div className="absolute right-0 top-[110%] w-[140px] bg-white border border-slate-200 rounded-md shadow-xl p-1.5 flex flex-col gap-0.5 slide-down z-50">
                                                <button onClick={() => { setIsActionMenuOpen(false); if (selectedIds.length === 0) return alert('항목을 체크해 주세요.'); setIsBulkEditModalOpen(true); }} className={`w-full text-left px-2.5 py-2 font-bold rounded text-[11px] transition-colors ${selectedIds.length > 0 ? 'text-letusBlue hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}>
                                                    일괄 수정 (지원/파견)
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-auto flex-1 custom-scrollbar bg-slate-50/30 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <svg className="animate-spin w-8 h-8 mb-4 text-letusBlue" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            <p className="font-bold text-sm">DB에서 데이터를 불러오고 있습니다...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'summary' && (
                                <div className="p-6 flex flex-col gap-6">
                                    {window.Recharts && chartDataList.length > 0 && (
                                        <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm h-72">
                                            <h4 className="text-xs font-bold text-gray-500 mb-4">월별 총 근무시간 추이 (전체 누적)</h4>
                                            <window.Recharts.ResponsiveContainer width="100%" height="100%">
                                                <window.Recharts.BarChart data={chartDataList} margin={{ top: 0, right: 0, left: -20, bottom: 25 }}>
                                                    <window.Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    <window.Recharts.XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                                                    <window.Recharts.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                                    <window.Recharts.Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold', padding: '2px 0' }} labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#374151', marginBottom: '4px' }} />
                                                    <window.Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', paddingTop: '15px' }} />
                                                    <window.Recharts.Bar dataKey="normal" name="정상근무" stackId="a" fill="#4b89ff" radius={[0, 0, 4, 4]} barSize={30} />
                                                    <window.Recharts.Bar dataKey="overtime" name="연장근무" stackId="a" fill="#f58220" radius={[4, 4, 0, 0]} />
                                                </window.Recharts.BarChart>
                                            </window.Recharts.ResponsiveContainer>
                                        </div>
                                    )}

                                    {summaryDataList.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 font-bold">집계할 데이터가 없습니다. 엑셀을 업로드해 주세요.</div>
                                    ) : (
                                        <table className="w-full text-center whitespace-nowrap bg-white border border-gray-200 shadow-sm">
                                            <thead className="bg-gray-100 border-b-2 border-gray-300 text-xs font-black text-gray-700">
                                                <tr>
                                                    <th className="p-3 border-r border-gray-200 w-32">구분</th>
                                                    <th className="p-3 border-r border-gray-200 w-48 text-left pl-6">업체명 (클릭하여 월별 상세 보기)</th>
                                                    <th className="p-3 border-r border-gray-200">정상근무</th>
                                                    <th className="p-3 border-r border-gray-200">연장근무</th>
                                                    <th className="p-3 border-r border-gray-200 bg-blue-50/50">합계</th>
                                                    <th className="p-3 bg-orange-50/50">가중시간</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[13px] text-gray-800">
                                                {summaryDataList.map((row) => {
                                                    const isExpanded = expandedVendors.includes(row.vendor);
                                                    return (
                                                        <React.Fragment key={row.vendor}>
                                                            <tr onClick={() => toggleVendor(row.vendor)} className={`border-b border-gray-200 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-blue-50/20'}`}>
                                                                <td className="p-3 border-r border-gray-200 font-black text-gray-600 bg-gray-50/30">{row.type}</td>
                                                                <td className="p-3 border-r border-gray-200 font-bold text-left pl-6 flex items-center gap-2"><span className="text-[10px] text-letusBlue w-3">{isExpanded ? '▼' : '▶'}</span>{row.vendor}</td>
                                                                <td className="p-3 border-r border-gray-200 text-right pr-6 font-mono text-gray-700 font-medium">{row.normal === 0 ? '-' : row.normal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                <td className="p-3 border-r border-gray-200 text-right pr-6 font-mono text-gray-700 font-medium">{row.overtime === 0 ? '-' : row.overtime.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                <td className="p-3 border-r border-gray-200 text-right pr-6 font-mono font-bold text-letusBlue bg-blue-50/10">{row.total === 0 ? '-' : row.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                <td className="p-3 text-right pr-6 font-mono font-bold text-red-500 bg-orange-50/10">{row.weighted === 0 ? '-' : row.weighted.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                            </tr>
                                                            {isExpanded && row.months.map((m, idx) => (
                                                                <tr key={`${row.vendor}-${m.month}`} className="bg-slate-50 border-b border-gray-100 text-gray-500 animate-fade-in">
                                                                    <td className="p-2 border-r border-gray-100 bg-slate-100/50"></td>
                                                                    <td className="p-2 border-r border-gray-100 text-left pl-10 font-bold text-[11px] flex items-center gap-2"><span className="text-gray-400">└</span> {m.month}</td>
                                                                    <td className="p-2 border-r border-gray-100 text-right pr-6 font-mono text-[12px]">{m.normal === 0 ? '-' : m.normal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                    <td className="p-2 border-r border-gray-100 text-right pr-6 font-mono text-[12px]">{m.overtime === 0 ? '-' : m.overtime.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                    <td className="p-2 border-r border-gray-100 text-right pr-6 font-mono font-bold text-[12px] text-blue-400">{m.total === 0 ? '-' : m.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                    <td className="p-2 text-right pr-6 font-mono font-bold text-[12px] text-red-400">{m.weighted === 0 ? '-' : m.weighted.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <tr className="bg-gray-200 border-t-2 border-gray-400 font-black text-gray-900">
                                                    <td colSpan="2" className="p-4 border-r border-gray-300 text-center tracking-widest">전체 총 합계</td>
                                                    <td className="p-4 border-r border-gray-300 text-right pr-6 font-mono text-[14px]">{totalSummary.normal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                    <td className="p-4 border-r border-gray-300 text-right pr-6 font-mono text-[14px]">{totalSummary.overtime.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                    <td className="p-4 border-r border-gray-300 text-right pr-6 font-mono text-[14px] text-blue-700">{totalSummary.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                    <td className="p-4 text-right pr-6 font-mono text-[14px] text-red-700">{totalSummary.weighted.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'detail' && (
                                <div className="flex flex-col gap-4 mt-2 p-4">
                                    {/* 🔥 기존 중복 필터 덩어리 싹 날림! 바로 테이블만 렌더링되게 수정 완료 */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left whitespace-nowrap">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 w-12 text-center border-r border-slate-100">
                                                            <input type="checkbox" checked={selectedIds.length === sortedDetailData.length && sortedDetailData.length > 0} onChange={handleSelectAll} className="w-4 h-4 accent-letusBlue cursor-pointer" />
                                                        </th>
                                                        {[
                                                            { key: 'work_date', label: '근무 일자' },
                                                            { key: 'company_type', label: '구분' },
                                                            { key: 'vendor_name', label: '원 소속 업체', isBorder: true },
                                                            { key: 'worked_vendor', label: '실 투입 (생산성 기준)', color: 'text-blue-600' },
                                                            { key: 'worker_name', label: '근무자명' },
                                                            { key: 'go_work_time', label: '출근' },
                                                            { key: 'leave_work_time', label: '퇴근', isBorder: true },
                                                            { key: 'normal_hours', label: '정상근무', color: 'text-emerald-600', isBold: true },
                                                            { key: 'overtime_hours', label: '연장근무', color: 'text-orange-500', isBold: true },
                                                            { key: 'work_hours', label: '총 시간', color: 'text-blue-600', isBorder: true, isBold: true },
                                                            { key: 'remark', label: '특이사항(비고)', align: 'left' }
                                                        ].map(col => (
                                                            <th
                                                                key={col.key}
                                                                onClick={() => requestSort(col.key)}
                                                                className={`p-3 ${col.align === 'left' ? 'text-left' : 'text-center'} cursor-pointer hover:bg-slate-100 transition-colors select-none ${col.isBorder ? 'border-r border-slate-100' : ''} ${col.color || ''} ${col.isBold ? 'font-black' : ''}`}
                                                            >
                                                                <div className={`flex items-center gap-1 ${col.align === 'left' ? 'justify-start' : 'justify-center'}`}>
                                                                    {col.label}
                                                                    {sortConfig && sortConfig.key === col.key && (
                                                                        <span className="text-blue-500 text-[14px] font-black">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700 bg-white">
                                                    {sortedDetailData.length === 0 ? (
                                                        <tr><td colSpan="12" className="text-center py-10 text-gray-400 font-bold">조건에 맞는 데이터가 없습니다.</td></tr>
                                                    ) : (
                                                        sortedDetailData.map((row) => {
                                                            const isSelected = selectedIds.includes(row.id);
                                                            const isDispatched = row.vendor_name !== row.worked_vendor;
                                                            return (
                                                                <tr key={row.id} onClick={() => handleSelectOne(row.id)} className={`transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`}>
                                                                    <td className="p-3 text-center border-r border-gray-50" onClick={e => e.stopPropagation()}>
                                                                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(row.id)} className="w-4 h-4 accent-letusBlue cursor-pointer" />
                                                                    </td>
                                                                    <td className="p-3 font-mono text-gray-500 text-center">{row.work_date}</td>
                                                                    <td className="p-3 text-center">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.company_type === '사내협력사' ? 'bg-blue-50 text-letusBlue border border-blue-100' : 'bg-orange-50 text-letusOrange border border-orange-100'}`}>
                                                                            {row.company_type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 font-bold text-gray-500 border-r border-gray-50 text-center">{row.vendor_name}</td>
                                                                    <td className={`p-3 font-black flex justify-center items-center gap-1.5 ${isDispatched ? 'text-red-500 bg-red-50/30' : 'text-gray-800'}`}>
                                                                        {isDispatched && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 shrink-0 tracking-tighter">지원 파견</span>}
                                                                        {row.worked_vendor}
                                                                    </td>
                                                                    <td className="p-3 font-black text-gray-900 text-center">{row.worker_name}</td>
                                                                    <td className="p-3 text-center font-bold text-gray-600">{row.start_time || '-'}</td>
                                                                    <td className="p-3 text-center font-bold text-gray-600 border-r border-gray-50">{row.end_time || '-'}</td>
                                                                    <td className="p-3 text-center font-bold text-green-600 bg-green-50/20">{Number(row.normal_hours).toFixed(1)}H</td>
                                                                    <td className="p-3 text-center font-bold text-orange-500 bg-orange-50/20">{Number(row.overtime_hours).toFixed(1)}H</td>
                                                                    <td className="p-3 text-center font-black text-letusBlue border-r border-gray-50 bg-blue-50/20">{Number(row.work_hours).toFixed(1)}H</td>
                                                                    <td className={`p-3 truncate max-w-[200px] text-xs ${isDispatched ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{row.remark}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isUploadModalOpen && <AttendanceUploadModal onClose={() => setIsUploadModalOpen(false)} onReload={fetchAttendance} />}

            {/* 🔥 일괄 수정 모달 연결 (DB 연동 시 onReload 전달) */}
            {isBulkEditModalOpen && <AttendanceBulkEditModal selectedIds={selectedIds} onClose={() => { setIsBulkEditModalOpen(false); setSelectedIds([]); }} onReload={fetchAttendance} />}
        </div>
    );
};

// 🔥 바깥에서 이 컴포넌트들을 부를 수 있게 내보내기 (가장 중요!)
window.AttendanceUploadModal = AttendanceUploadModal;
window.AttendanceBulkEditModal = AttendanceBulkEditModal;
window.AttendanceManagement = AttendanceManagement;
