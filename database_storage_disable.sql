-- Storage 버킷의 업로드 요건(RLS)을 기술적으로 완전히 강제 해제하는 구문입니다.
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
