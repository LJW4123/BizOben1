document.addEventListener('DOMContentLoaded', async () => {

    // 1. Supabase 클라이언트 초기화를 문서 로드 100% 완료 시점으로 이동 (에러 방지용)
    if (!window.supabase) {
        console.error("Supabase 라이브러리 로드 실패");
        const errHtml = '<div style="padding:15px; color:var(--danger);">데이터베이스 연결 오류 (라이브러리 미설치)</div>';
        const pCont = document.getElementById('participantListContainer');
        const fCont = document.getElementById('fileListContainer');
        if (pCont) pCont.innerHTML = errHtml;
        if (fCont) fCont.innerHTML = errHtml;
        return;
    }

    const supabaseUrl = 'https://bmgaeoysqkzddltjvvcn.supabase.co';
    const supabaseKey = 'sb_publishable_qYeMU5krnSuyHC3AWe4wMA_jzGll9hX';
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    // [DB 연동] 참여자 얼라인 데이터 불러오기
    async function loadParticipants() {
        const container = document.getElementById('participantListContainer');
        if (!container) return;

        try {
            const { data, error } = await supabaseClient.from('participants').select('*');
            if (error) {
                console.error('participants 쿼리 에러:', error);
                throw error;
            }

            if (data && data.length > 0) {
                container.innerHTML = ''; // 로딩 텍스트 제거
                data.forEach(p => {
                    const colorVar = p.understanding_level >= 80 ? 'var(--success)' : 'var(--warning)';
                    const isChecked = p.history_checked ? 'checked' : '';

                    const html = `
                        <div class="participant-item">
                            <div class="participant-info">
                                <strong>${p.name || '알 수 없는 참여자'} (${p.manager_name || '-'})</strong>
                                <div>
                                    <span class="gauge-label">업무 이해도 ${p.understanding_level || 0}%</span>
                                    <button class="btn-icon" style="color:var(--danger); margin-left:10px; font-size:12px; padding:2px;" onclick="deleteParticipant(${p.id})" title="참여자 삭제"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                            <div class="gauge-container">
                                <div class="gauge-bar" style="width: ${p.understanding_level || 0}%; background: ${colorVar};"></div>
                            </div>
                            <label class="checkbox-container">
                                <input type="checkbox" ${isChecked} disabled> 이전 사업 이력 확인 완료
                            </label>
                        </div>
                    `;
                    container.innerHTML += html;
                });
            } else {
                container.innerHTML = '<div style="padding:15px; color:var(--text-muted);">지금 바로 Supabase에서 테이블에 임의의 데이터를 1줄 추가해 보세요!</div>';
            }
        } catch (err) {
            container.innerHTML = `<div style="padding:15px; color:var(--danger);">데이터 로드 실패: ${err.message || '알지 못하는 오류가 발생했습니다.'}</div>`;
        }
    }

    // 전역 함수: 참여자 삭제
    window.deleteParticipant = async (id) => {
        if (!confirm('이 참여자를 정말 삭제하시겠습니까?')) return;
        try {
            await supabaseClient.from('participants').delete().eq('id', id);
            await loadParticipants();
        } catch (e) {
            alert('삭제 오류: ' + e.message);
        }
    };

    // [DB 연동] 운영 맥락 파일 불러오기
    async function loadContextFiles() {
        const container = document.getElementById('fileListContainer');
        if (!container) return;

        try {
            const { data, error } = await supabaseClient.from('context_files').select('*');
            if (error) {
                console.error('context_files 쿼리 에러:', error);
                throw error;
            }

            if (data && data.length > 0) {
                container.innerHTML = '';
                data.forEach(file => {
                    const isPdf = file.file_type === 'pdf';
                    const iconClass = isPdf ? 'fa-file-pdf pdf-icon' : 'fa-file-word word-icon';

                    const html = `
                        <li>
                            <i class="fa-solid ${iconClass}"></i>
                            <div class="file-details">
                                <span class="file-name">${file.file_name}</span>
                                <span class="file-memo">${file.memo || '...'}</span>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <button class="btn-icon" title="다운로드" onclick="window.open('${file.file_url || '#'}', '_blank')"><i class="fa-solid fa-download"></i></button>
                                <button class="btn-icon" title="삭제" style="color:var(--danger);" onclick="deleteContextFile(${file.id}, '${file.file_url || ''}')"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </li>
                    `;
                    container.innerHTML += html;
                });
            } else {
                container.innerHTML = '<div style="padding:15px; color:var(--text-muted);">저장된 문서가 없습니다.</div>';
            }
        } catch (err) {
            container.innerHTML = `<div style="padding:15px; color:var(--danger);">데이터 로드 실패: ${err.message || '알지 못하는 오류가 발생했습니다.'}</div>`;
        }
    }

    // 전역 함수: 파일 목록 삭제
    window.deleteContextFile = async (id, fileUrl) => {
        if (!confirm('해당 문서와 파일 데이터를 삭제하시겠습니까?')) return;
        try {
            // 스토리지 파일 실제 삭제
            if (fileUrl && fileUrl.includes('documents/')) {
                const parts = fileUrl.split('documents/');
                if (parts.length > 1) {
                    const filePath = parts[1];
                    await supabaseClient.storage.from('documents').remove([filePath]);
                }
            }
            // DB 기록 삭제
            await supabaseClient.from('context_files').delete().eq('id', id);
            await loadContextFiles();
        } catch (e) {
            alert('삭제 오류: ' + e.message);
        }
    };

    // DB 데이터 로드 실행
    await loadParticipants();
    await loadContextFiles();

    // ----------------------------------------------------------------------
    // [DB 통신] 업무 진행 현황 (전체 진행률 및 단계)
    // ----------------------------------------------------------------------
    async function loadProgressData() {
        const container = document.getElementById('progressSectionContainer');
        if (!container) return;

        try {
            // 테이블이 없을 경우를 대비한 안전한 조회
            const [metaRes, stagesRes] = await Promise.all([
                supabaseClient.from('project_metadata').select('*').eq('id', 1).maybeSingle(),
                supabaseClient.from('progress_stages').select('*').order('step_order', { ascending: true })
            ]);

            const progressValue = metaRes.data ? metaRes.data.overall_progress : 0;
            const stages = stagesRes.data || [];

            // Stepper HTML 생성
            let stepperHtml = '<div class="stepper">';
            stages.forEach((stage, idx) => {
                const isCompleted = stage.is_completed;
                const stepClass = isCompleted ? 'completed' : (idx === stages.findIndex(s => !s.is_completed) ? 'active' : '');
                const iconContent = isCompleted ? '<i class="fa-solid fa-check"></i>' : (idx + 1);

                stepperHtml += `
                    <div class="step ${stepClass}">
                        <div class="step-icon">${iconContent}</div>
                        <div class="step-label">${stage.name}</div>
                        <div style="display:flex; gap:5px; margin-top:5px;">
                            <button onclick="toggleStage(${stage.id}, ${!isCompleted})" style="border:none; background:none; color:var(--primary-color); cursor:pointer; font-size:12px;" title="상태 변경"><i class="fa-solid ${isCompleted ? 'fa-rotate-left' : 'fa-check'}"></i></button>
                            <button onclick="deleteStage(${stage.id})" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:12px;" title="단계 삭제"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;

                // 연결선 추가 (마지막 요소 전까지)
                if (idx < stages.length - 1) {
                    const nextCompleted = stages[idx + 1].is_completed;
                    const lineClass = isCompleted ? (nextCompleted ? 'completed' : 'active') : '';
                    stepperHtml += `<div class="step-line ${lineClass}"></div>`;
                }
            });
            stepperHtml += '</div>';

            container.innerHTML = `
                <div class="progress-header">
                    <span>전체 프로젝트 진행률</span>
                    <span class="progress-percent">${progressValue}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressValue}%;"></div>
                </div>
                ${stages.length > 0 ? stepperHtml : '<div style="text-align:center; color:var(--text-muted);">현재 등록된 단계가 없습니다.</div>'}
            `;

        } catch (err) {
            container.innerHTML = `<div style="color:var(--danger);">진행 현황 로드 실패: ${err.message}. SQL 테이블을 생성해주세요.</div>`;
        }
    }

    // 단계 삭제 전역 함수
    window.deleteStage = async (id) => {
        if (!confirm('해당 단계를 완전히 삭제하시겠습니까?')) return;
        await supabaseClient.from('progress_stages').delete().eq('id', id);
        await loadProgressData();
    };

    // 단계 상태 변경 전역 함수
    window.toggleStage = async (id, newStatus) => {
        await supabaseClient.from('progress_stages').update({ is_completed: newStatus }).eq('id', id);
        await loadProgressData();
    };

    const updateProgressBtn = document.getElementById('updateProgressBtn');
    if (updateProgressBtn) {
        updateProgressBtn.addEventListener('click', async () => {
            const val = document.getElementById('overallProgressInput').value;
            if (val === '') return alert('진행률(0-100)을 입력하세요.');

            // 기존 레코드 검사 및 upsert (id:1)
            const { error } = await supabaseClient.from('project_metadata').upsert({ id: 1, overall_progress: parseInt(val) });
            if (error) return alert('진행률 업데이트 실패: ' + error.message);

            document.getElementById('overallProgressInput').value = '';
            await loadProgressData();
        });
    }

    const addStageBtn = document.getElementById('addStageBtn');
    if (addStageBtn) {
        addStageBtn.addEventListener('click', async () => {
            const name = document.getElementById('stageNameInput').value;
            const completed = document.getElementById('stageCompletedCheck').checked;
            if (!name) return alert('단계명을 입력하세요.');

            const originalBtn = addStageBtn.innerHTML;
            addStageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            addStageBtn.disabled = true;

            try {
                // 제일 마지막 순서 가져오기
                const { data } = await supabaseClient.from('progress_stages').select('step_order').order('step_order', { ascending: false }).limit(1);
                let nextOrder = 1;
                if (data && data.length > 0) nextOrder = data[0].step_order + 1;

                const { error } = await supabaseClient.from('progress_stages').insert([{
                    name: name,
                    is_completed: completed,
                    step_order: nextOrder
                }]);

                if (error) throw error;

                document.getElementById('stageNameInput').value = '';
                document.getElementById('stageCompletedCheck').checked = false;
                await loadProgressData();
            } catch (err) {
                alert('단계 추가 실패: ' + err.message);
            } finally {
                addStageBtn.innerHTML = originalBtn;
                addStageBtn.disabled = false;
            }
        });
    }

    await loadProgressData();

    // ----------------------------------------------------------------------
    // [DB 통신] 새 참여자 추가 로직
    // ----------------------------------------------------------------------
    const addParticipantBtn = document.getElementById('addParticipantBtn');
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', async () => {
            const name = document.getElementById('partNameInput').value;
            const manager = document.getElementById('partManagerInput').value;
            const level = document.getElementById('partLevelInput').value || 0;
            const history = document.getElementById('partHistoryCheck').checked;

            if (!name) {
                alert('기관명을 입력해주세요.');
                return;
            }

            const originalBtn = addParticipantBtn.innerHTML;
            addParticipantBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            addParticipantBtn.disabled = true;

            try {
                const { error } = await supabaseClient.from('participants').insert([{
                    name: name,
                    manager_name: manager,
                    understanding_level: parseInt(level),
                    history_checked: history
                }]);

                if (error) throw error;

                // 폼 초기화
                document.getElementById('partNameInput').value = '';
                document.getElementById('partManagerInput').value = '';
                document.getElementById('partLevelInput').value = '';
                document.getElementById('partHistoryCheck').checked = false;

                // 리스트 다시 불러오기
                await loadParticipants();

            } catch (err) {
                alert('참여자 등록 에러: ' + err.message);
            } finally {
                addParticipantBtn.innerHTML = originalBtn;
                addParticipantBtn.disabled = false;
            }
        });
    }

    // ----------------------------------------------------------------------
    // [DB 통신] 파일 업로드 로직 (Storage + DB 연동)
    // ----------------------------------------------------------------------
    const fileUploadBox = document.getElementById('fileUploadBox');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileUploadBtn = document.getElementById('fileUploadBtn');
    const fileMemoInput = document.getElementById('fileMemoInput');

    if (fileUploadBox && fileInput) {
        fileUploadBox.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
                fileNameDisplay.style.color = "var(--primary-color)";
                fileNameDisplay.style.fontWeight = "bold";
            }
        });
    }

    if (fileUploadBtn) {
        fileUploadBtn.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('업로드할 파일을 먼저 선택해주세요!');
                return;
            }
            const file = fileInput.files[0];
            const memo = fileMemoInput.value;
            const fileExt = file.name.split('.').pop().toLowerCase();
            let fileType = 'other';
            if (['pdf'].includes(fileExt)) fileType = 'pdf';
            if (['doc', 'docx'].includes(fileExt)) fileType = 'word';

            const originalHtml = fileUploadBtn.innerHTML;
            fileUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 업로드 중...';
            fileUploadBtn.disabled = true;

            try {
                // 1. Supabase Storage 에 파일 업로드 (한글/특수문자 에러 원천 차단 무작위 난수화)
                const randomStr = Math.random().toString(36).substring(2, 10);
                const safeName = `${Date.now()}_${randomStr}.${fileExt}`;
                const filePath = `uploads/${safeName}`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) {
                    throw new Error('Storage 에러 상세: ' + uploadError.message);
                }

                // 2. 업로드된 파일의 접속 가능 URL 알아내기
                const { data: publicUrlData } = supabaseClient.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                const fileUrl = publicUrlData.publicUrl;

                // 3. 파일 메타데이터를 DB(context_files)에 저장하기
                const { error: dbError } = await supabaseClient.from('context_files').insert([{
                    file_name: file.name,
                    memo: memo,
                    file_type: fileType,
                    file_url: fileUrl
                }]);

                if (dbError) {
                    console.error('DB 저장 에러:', dbError.message);
                    throw dbError;
                }

                alert('파일이 성공적으로 업로드 및 저장되었습니다!');

                // 폼 초기화
                fileInput.value = '';
                fileMemoInput.value = '';
                fileNameDisplay.textContent = '클릭하여 파일을 선택하세요';
                fileNameDisplay.style.color = '';
                fileNameDisplay.style.fontWeight = 'normal';

                // 파일 리스트 다시 그리기
                await loadContextFiles();

            } catch (err) {
                alert('업로드 오류: ' + err.message);
            } finally {
                fileUploadBtn.innerHTML = originalHtml;
                fileUploadBtn.disabled = false;
            }
        });
    }


    // ----------------------------------------------------------------------
    // [UI 상호작용] 사이드바 메뉴 탭(화면 숨김/표시) 완전 활성화 로직
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const sections = {
        '#dashboard': ['progress', 'alignment', 'recommendation', 'api-storage', 'reports'],
        '#api-storage': ['api-storage'],
        '#reports': ['reports'],
        '#alignment': ['alignment'],
        '#recommendation': ['recommendation'],
        '#progress': ['progress']
    };

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault(); // 기본 스크롤 다운 방지

            // 버튼 색상 변경
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // 목적지 ID 분석
            const targetId = this.getAttribute('href');
            let showList = sections[targetId];
            if (!showList) showList = sections['#dashboard']; // 매칭 실패시 대시보드(전체)

            // 섹션 숨기기/보이기
            document.querySelectorAll('main section.card').forEach(sec => {
                if (showList.includes(sec.id)) {
                    sec.style.display = 'block';
                } else {
                    sec.style.display = 'none';
                }
            });
        });
    });


    // ----------------------------------------------------------------------
    // 기타 애니메이션 및 팝업 모달 로직
    // ----------------------------------------------------------------------
    const recommendBtn = document.getElementById('recommendBtn');
    const recommendResult = document.getElementById('recommendResult');

    if (recommendBtn) {
        recommendBtn.addEventListener('click', () => {
            const budgetInput = document.getElementById('budgetInput');
            const budget = budgetInput.value;

            if (budget && parseInt(budget) > 0) {
                const originalHtml = recommendBtn.innerHTML;
                recommendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 모델 분석 중...';
                recommendBtn.disabled = true;

                setTimeout(() => {
                    recommendBtn.innerHTML = originalHtml;
                    recommendBtn.disabled = false;
                    recommendResult.classList.remove('hidden');
                }, 1000);
            } else {
                alert('올바른 예산 금액을 입력해주세요.');
            }
        });
    }

    const verifyBtn = document.getElementById('verifyBtn');
    const verifyModal = document.getElementById('verifyModal');
    const closeModal = document.querySelector('.close-modal');

    if (verifyBtn && verifyModal) {
        verifyBtn.addEventListener('click', () => {
            verifyModal.classList.add('active');
        });
        closeModal.addEventListener('click', () => {
            verifyModal.classList.remove('active');
        });
        window.addEventListener('click', (e) => {
            if (e.target === verifyModal) {
                verifyModal.classList.remove('active');
            }
        });
    }

    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const pWidth = progressBar.style.width;
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.width = pWidth;
        }, 500);
    }

    // ----------------------------------------------------------------------
    // [Mock Data] API 데이터 저장소 & 생성 리포트 데이터 로드
    // ----------------------------------------------------------------------
    function loadApiStorageData() {
        const listBody = document.getElementById('apiDataListBody');
        if (!listBody) return;

        const mockData = [
            { company: '(주)테크솔루션', manager: '홍*동', phone: '010-12**-****', email: 'j***@techsol.co.kr', address: '서울시 강남구 **로 **길 **', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '상', date: '2025-05-23 14:30:21', color: 'high' },
            { company: '미래바이오(주)', manager: '김*영', phone: '010-23**-****', email: 'k***@mirbio.co.kr', address: '경기도 성남시 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '중', date: '2025-05-23 14:29:58', color: 'medium' },
            { company: '스카이엔지니어링', manager: '이*준', phone: '010-34**-****', email: 'l***@skyeng.co.kr', address: '부산시 해운대구 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '하', date: '2025-05-23 14:28:47', color: 'low' },
            { company: '(주)그린에너지', manager: '박*민', phone: '010-45**-****', email: 'p***@greenenergy.co.kr', address: '대전시 유성구 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '중', date: '2025-05-23 14:27:13', color: 'medium' },
            { company: '넥스트피아(주)', manager: '최*아', phone: '010-56**-****', email: 'c***@nextpia.co.kr', address: '인천시 연수구 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '상', date: '2025-05-23 14:25:39', color: 'high' },
            { company: '하이퍼커넥트', manager: '정*훈', phone: '010-67**-****', email: 'j***@hyperconnect.co.kr', address: '광주시 서구 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '하', date: '2025-05-23 14:24:02', color: 'low' },
            { company: '에이플러스랩', manager: '오*린', phone: '010-78**-****', email: 'o***@apluslab.co.kr', address: '울산시 남구 **로', beneficiaryId: 'BEN-2026-****', status: '저장 완료', importance: '중', date: '2025-05-23 14:22:18', color: 'medium' },
        ];

        listBody.innerHTML = mockData.map(item => `
            <tr style="cursor:pointer;" onclick="updateApiPreview('${item.company}', '${item.manager}', '${item.email}', '${item.address}', '${item.beneficiaryId}')">
                <td style="font-weight:500;">${item.company}</td>
                <td>${item.manager}</td>
                <td style="font-size:12px;">${item.phone}</td>
                <td style="font-size:12px; color:var(--primary-light);">${item.email}</td>
                <td style="font-size:12px;">${item.address}</td>
                <td style="font-size:12px; color:var(--text-muted);">${item.beneficiaryId}</td>
                <td><span style="background:#EBFDF5; color:#10B981; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">저장 완료</span></td>
                <td><span class="importance-tag importance-${item.color}">${item.importance}</span></td>
                <td style="font-size:12px; color:var(--text-muted);">${item.date}</td>
            </tr>
        `).join('');
    }

    function loadReportData() {
        const listBody = document.getElementById('reportListBody');
        if (!listBody) return;

        const mockReports = [
            { name: '기업 사회공헌 운영 리포트.pdf', base: '기업정보, 담당자, 수혜자ID', date: '2025-05-23 14:40', format: 'PDF', status: '완료' },
            { name: '취약계층 지원 현황 요약.xlsx', base: '수혜자ID, 업무진행, 마스킹데이터', date: '2025-05-23 13:25', format: 'XLSX', status: '완료' },
            { name: '기관별 협업 이슈 분석 리포트.pdf', base: 'API 연동, 협업이슈, 업무진행', date: '2025-05-22 17:08', format: 'PDF', status: '완료' },
            { name: 'ESG 활동 증빙용 요약본.pdf', base: '기업정보, 업무진행, 리포트자료', date: '2025-05-22 11:45', format: 'PDF', status: '완료' },
            { name: '지원 대상자 마스킹 데이터 리포트.xlsx', base: '마스킹데이터, 수혜자ID', date: '2025-05-21 16:32', format: 'XLSX', status: '완료' },
        ];

        listBody.innerHTML = mockReports.map(report => `
            <tr style="cursor:pointer;" onclick="updateReportPreview('${report.name}')">
                <td style="font-weight:600;"><i class="fa-solid fa-file-${report.format === 'PDF' ? 'pdf' : 'excel'}" style="color:${report.format === 'PDF' ? 'var(--danger)' : 'var(--success)'}; margin-right:8px;"></i>${report.name}</td>
                <td style="font-size:13px;">${report.base}</td>
                <td style="font-size:13px;">${report.date}</td>
                <td><span class="badge" style="background:var(--secondary-bg); color:var(--primary-light);">${report.format}</span></td>
                <td><span class="status-badge status-done">${report.status}</span></td>
                <td>
                    <button class="btn-icon" title="미리보기"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-icon" title="다운로드"><i class="fa-solid fa-download"></i></button>
                </td>
            </tr>
        `).join('');
    }

    window.updateApiPreview = (company, manager, email, address, beneficiaryId) => {
        const jsonBlock = document.getElementById('jsonPreview');
        
        // Mock JSON update
        const mockJson = {
            "companyName": company,
            "contactName": manager,
            "phone": "010-****-****",
            "email": email,
            "address": address,
            "beneficiaryId": beneficiaryId,
            "businessNumber": "12*-**-*****"
        };
        
        jsonBlock.textContent = JSON.stringify(mockJson, null, 2);
    };

    window.updateReportPreview = (name) => {
        const previewName = document.getElementById('previewReportName');
        if (previewName) previewName.textContent = name;
    };

    loadApiStorageData();
    loadReportData();
});
