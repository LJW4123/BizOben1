-- 비즈오벤(BizOben) 업무 진행 현황 기능 확장을 위한 추가 SQL문 --

-- 1. 프로젝트 메타데이터 (전체 진행률) 테이블
CREATE TABLE IF NOT EXISTS project_metadata (
    id INT PRIMARY KEY DEFAULT 1,
    overall_progress INT DEFAULT 0
);

-- 초기 기본 진행률 값 삽입
INSERT INTO project_metadata (id, overall_progress) 
VALUES (1, 65) 
ON CONFLICT (id) DO NOTHING;

-- 2. 프로젝트 진행 단계 (기획, 매칭, 배송 등) 테이블
CREATE TABLE IF NOT EXISTS progress_stages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    step_order INT DEFAULT 0
);

-- 초기 기초 단계 데이터 삽입
INSERT INTO progress_stages (name, is_completed, step_order) VALUES
('기획', true, 1),
('매칭', true, 2),
('배송', false, 3),
('보고', false, 4);
