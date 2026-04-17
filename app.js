// 1. Supabase 접속 설정
const supabaseUrl = 'https://bmgaeoysqkzddltjvvcn.supabase.co';
const supabaseKey = 'sb_publishable_qYeMU5krnSuyHC3AWe4wMA_jzGll9hX';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {

    // [DB 연동] 참여자 얼라인 데이터 불러오기 및 HTML 생성
    async function loadParticipants() {
        try {
            const { data, error } = await supabaseClient.from('participants').select('*');
            if (error) throw error;

            const container = document.getElementById('participantListContainer');
            if (!container) return;

            if (data && data.length > 0) {
                container.innerHTML = ''; // 로딩 텍스트 제거
                data.forEach(p => {
                    // 게이지 색상 결정 (이해도가 낮으면 주황색, 높으면 초록색)
                    const colorVar = p.understanding_level >= 80 ? 'var(--success)' : 'var(--warning)';

                    const html = `
                        <div class="participant-item">
                            <div class="participant-info">
                                <strong>${p.name} (${p.manager_name})</strong>
                                <span class="gauge-label">업무 이해도 ${p.understanding_level}%</span>
                            </div>
                            <div class="gauge-container">
                                <div class="gauge-bar" style="width: ${p.understanding_level}%; background: ${colorVar};"></div>
                            </div>
                            <label class="checkbox-container">
                                <input type="checkbox" ${p.history_checked ? 'checked' : ''} disabled> 이전 사업 이력 확인 완료
                            </label>
                        </div>
                    `;
                    container.innerHTML += html;
                });
            } else {
                container.innerHTML = '<div style="padding:15px; color:var(--text-muted);">등록된 참여자가 없습니다.</div>';
            }
        } catch (err) {
            console.error('참여자 로드 에러:', err);
            document.getElementById('participantListContainer').innerHTML = '데이터를 불러오는 중 문제가 발생했습니다.';
        }
    }

    // [DB 연동] 운영 맥락 파일 리스트 불러오기
    async function loadContextFiles() {
        try {
            const { data, error } = await supabaseClient.from('context_files').select('*');
            if (error) throw error;

            const container = document.getElementById('fileListContainer');
            if (!container) return;

            if (data && data.length > 0) {
                container.innerHTML = '';
                data.forEach(file => {
                    // 확장자에 따른 아이콘 변경
                    const isPdf = file.file_type === 'pdf';
                    const iconClass = isPdf ? 'fa-file-pdf pdf-icon' : 'fa-file-word word-icon';

                    const html = `
                        <li>
                            <i class="fa-solid ${iconClass}"></i>
                            <div class="file-details">
                                <span class="file-name">${file.file_name}</span>
                                <span class="file-memo">${file.memo}</span>
                            </div>
                            <button class="btn-icon" title="다운로드"><i class="fa-solid fa-download"></i></button>
                        </li>
                    `;
                    container.innerHTML += html;
                });
            } else {
                container.innerHTML = '<div style="padding:15px; color:var(--text-muted);">업로드된 파일이 없습니다.</div>';
            }
        } catch (err) {
            console.error('파일 목록 로드 에러:', err);
            document.getElementById('fileListContainer').innerHTML = '데이터를 불러오는 중 문제가 발생했습니다.';
        }
    }

    // 초기 데이터 로드 비동기 실행
    await loadParticipants();
    await loadContextFiles();

    // -------------------------------------------------------------
    // 아래는 이전과 동일한 애니메이션 및 UI 상호작용 로직들
    // -------------------------------------------------------------

    // 1. 물품 및 수혜자 추천 로직 (AI 시뮬레이션)
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

    // 2. 과거 유사 사례 검증 리포트 모달 로직
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

    // 3. 사이드바 메뉴 활성화 스위칭
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 4. 게이지 & 프로그레스바 초기 로딩 애니메이션
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const pWidth = progressBar.style.width;
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.width = pWidth;
        }, 500);
    }
});
