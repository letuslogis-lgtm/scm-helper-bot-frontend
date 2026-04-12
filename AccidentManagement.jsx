{/* 🚩 1. table-fixed와 min-w-[1420px] 제거 (사용자 관리 메뉴와 동일한 뼈대로 복원) */}
<table className="w-full text-left whitespace-nowrap text-[13px]">
    <thead className="bg-slate-50 border-b border-gray-200 text-xs text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
        {/* 🚩 2. 테이블 비율 계산을 망치던 유령 <tr> 태그 완전히 삭제! */}
        <tr>
            {/* 🚩 3. 사용자 관리와 토씨 하나 안 틀린 동일한 클래스 적용 */}
            <th className="p-4 pl-6 w-10 text-center">
                <input
                    type="checkbox"
                    checked={sortedItems.length > 0 && selectedIds.length === sortedItems.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-letusBlue"
                />
            </th>
            {[
                { label: '서비스예약일', key: 'service_date', w: '110px' },
                { label: '브랜드', key: 'brand', w: '90px' },
                { label: '서비스센터', key: 'service_center', w: '90px' },
                { label: '시공/AS', key: 'service_type', w: '80px' },
                { label: '수주번호', key: 'order_no', w: '150px' },
                { label: '수주건명', key: 'order_name', w: 'auto' }, // 🚩 4. 다시 auto로 변경! (남는 화면 여백을 얘가 스펀지처럼 다 흡수해줌)
                { label: '품목코드', key: 'item_code', w: '180px' },
                { label: '수량', key: 'issue_qty', w: '70px' },
                { label: '처리상태', key: 'status', w: '120px' },
                { label: '귀책부서', key: 'responsible_dept', w: '120px' },
                ...(isAiView
                    ? [{ label: '🤖 AI 사고 원인 분석', key: 'ai_analyzed_cause', w: '240px' }]
                    : [
                        { label: '확인 결과', key: 'action_result', w: '130px' },
                        { label: '납기지연판별', key: 'is_delayed', w: '110px' }
                    ]
                )
            ].map((col, idx) => (
                <th
                    key={idx}
                    className={`p-4 text-center select-none ${col.key ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                    style={{ width: col.w }}
                    onClick={() => col.key && requestSort(col.key)}
                >
                    <div className="flex items-center justify-center gap-1">
                        {col.label} {col.key && getSortIcon(col.key)}
                    </div>
                </th>
            ))}
        </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
        {/* ... (이 아래 tbody 내용들은 기존과 완벽히 동일합니다!) ... */}
