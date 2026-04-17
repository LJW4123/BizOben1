-- 비즈오벤(BizOben) 프로젝트용 초기 데이터베이스 구축 SQL문 --

-- 1. 참여자 얼라인 파트 (participants)
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255),
    understanding_level INT DEFAULT 0,
    history_checked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 기초 데이터 삽입 (기존 하드코딩된 내용)
INSERT INTO participants (name, manager_name, understanding_level, history_checked)
VALUES 
('A 복지재단', '홍길동 담당자', 85, true),
('B 물류 파트너', '김철수 매니저', 60, false);


-- 2. 운영 맥락 저장소 파트 (context_files)
CREATE TABLE IF NOT EXISTS context_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    memo TEXT,
    file_type VARCHAR(50),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 기초 데이터 삽입
INSERT INTO context_files (file_name, memo, file_type)
VALUES
('2025 겨울 방한 용품 선정 근거.pdf', '방한 물품 선정 시 ESG 기준 적용에 대한 판단 근거', 'pdf'),
('A 복지관 협업 유의사항.docx', '과거 지원 시 발생했던 커뮤니케이션 이슈 및 대응 방안', 'word');
