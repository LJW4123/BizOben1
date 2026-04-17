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
                                <span class="gauge-label">업무 이해도 ${p.understanding_level || 0}%</span>
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
                            <button class="btn-icon" title="다운로드"><i class="fa-solid fa-download"></i></button>
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

    // DB 데이터 로드 실행
    await loadParticipants();
    await loadContextFiles();


    // ----------------------------------------------------------------------
    // [UI 상호작용] 사이드바 메뉴 탭(화면 숨김/표시) 완전 활성화 로직
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const sections = {
        '#dashboard': ['progress', 'alignment', 'recommendation', 'context'],
        '#context': ['context'],
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
});
