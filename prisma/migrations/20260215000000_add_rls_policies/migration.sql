-- =============================================================
-- Row Level Security (RLS) 정책
-- 세션 변수: rls.teacher_id, rls.teacher_role, rls.team_id
-- (src/lib/db/rbac.ts의 setRLSSessionContext에서 SET LOCAL로 설정)
-- =============================================================

-- -------------------------------------------------------------
-- 1. Student 테이블 RLS
-- -------------------------------------------------------------
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;

-- Prisma migration 등 애플리케이션 외부 접근을 위해 테이블 소유자는 RLS 우회
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 모든 데이터 접근
CREATE POLICY "student_director_full_access" ON "Student"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- TEAM_LEADER / MANAGER: 같은 팀의 학생 접근
CREATE POLICY "student_team_access" ON "Student"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND "teamId" IS NOT NULL
    AND "teamId" = current_setting('rls.team_id', true)
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND "teamId" IS NOT NULL
    AND "teamId" = current_setting('rls.team_id', true)
  );

-- TEACHER: 자신에게 배정된 학생만 접근
CREATE POLICY "student_teacher_own_access" ON "Student"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  );

-- -------------------------------------------------------------
-- 2. Teacher 테이블 RLS
-- -------------------------------------------------------------
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 모든 교사 접근
CREATE POLICY "teacher_director_full_access" ON "Teacher"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- TEAM_LEADER / MANAGER: 같은 팀 교사 + 본인
CREATE POLICY "teacher_team_access" ON "Teacher"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "id" = current_setting('rls.teacher_id', true)
      OR (
        "teamId" IS NOT NULL
        AND "teamId" = current_setting('rls.team_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "id" = current_setting('rls.teacher_id', true)
      OR (
        "teamId" IS NOT NULL
        AND "teamId" = current_setting('rls.team_id', true)
      )
    )
  );

-- TEACHER: 본인 정보만 접근
CREATE POLICY "teacher_self_access" ON "Teacher"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "id" = current_setting('rls.teacher_id', true)
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "id" = current_setting('rls.teacher_id', true)
  );

-- -------------------------------------------------------------
-- 3. CounselingSession 테이블 RLS
-- -------------------------------------------------------------
ALTER TABLE "CounselingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CounselingSession" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 전체 접근
CREATE POLICY "counseling_director_full_access" ON "CounselingSession"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- TEAM_LEADER / MANAGER: 팀 내 상담 기록 접근 (학생의 teamId 기준 서브쿼리)
CREATE POLICY "counseling_team_access" ON "CounselingSession"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "CounselingSession"."studentId"
        AND s."teamId" = current_setting('rls.team_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "CounselingSession"."studentId"
        AND s."teamId" = current_setting('rls.team_id', true)
      )
    )
  );

-- TEACHER: 본인의 상담 기록만
CREATE POLICY "counseling_teacher_own_access" ON "CounselingSession"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  );

-- -------------------------------------------------------------
-- 4. GradeHistory 테이블 RLS
-- -------------------------------------------------------------
ALTER TABLE "GradeHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GradeHistory" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 전체 접근
CREATE POLICY "grade_director_full_access" ON "GradeHistory"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- TEAM_LEADER / MANAGER: 팀 내 성적 접근
CREATE POLICY "grade_team_access" ON "GradeHistory"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s."id" = "GradeHistory"."studentId"
      AND s."teamId" = current_setting('rls.team_id', true)
    )
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s."id" = "GradeHistory"."studentId"
      AND s."teamId" = current_setting('rls.team_id', true)
    )
  );

-- TEACHER: 본인 학생의 성적만
CREATE POLICY "grade_teacher_own_access" ON "GradeHistory"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "GradeHistory"."studentId"
        AND s."teacherId" = current_setting('rls.teacher_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "GradeHistory"."studentId"
        AND s."teacherId" = current_setting('rls.teacher_id', true)
      )
    )
  );

-- -------------------------------------------------------------
-- 5. StudentSatisfaction 테이블 RLS
-- -------------------------------------------------------------
ALTER TABLE "StudentSatisfaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentSatisfaction" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 전체 접근
CREATE POLICY "satisfaction_director_full_access" ON "StudentSatisfaction"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- TEAM_LEADER / MANAGER: 팀 내 만족도 접근
CREATE POLICY "satisfaction_team_access" ON "StudentSatisfaction"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "StudentSatisfaction"."studentId"
        AND s."teamId" = current_setting('rls.team_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) IN ('TEAM_LEADER', 'MANAGER')
    AND (
      "teacherId" = current_setting('rls.teacher_id', true)
      OR EXISTS (
        SELECT 1 FROM "Student" s
        WHERE s."id" = "StudentSatisfaction"."studentId"
        AND s."teamId" = current_setting('rls.team_id', true)
      )
    )
  );

-- TEACHER: 본인 관련 만족도만
CREATE POLICY "satisfaction_teacher_own_access" ON "StudentSatisfaction"
  FOR ALL
  USING (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  )
  WITH CHECK (
    current_setting('rls.teacher_role', true) = 'TEACHER'
    AND "teacherId" = current_setting('rls.teacher_id', true)
  );

-- -------------------------------------------------------------
-- 6. AuditLog 테이블 RLS (원장만 전체 접근, 나머지는 본인 기록만)
-- -------------------------------------------------------------
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

-- DIRECTOR: 전체 감사 로그 접근
CREATE POLICY "audit_director_full_access" ON "audit_logs"
  FOR ALL
  USING (current_setting('rls.teacher_role', true) = 'DIRECTOR')
  WITH CHECK (current_setting('rls.teacher_role', true) = 'DIRECTOR');

-- 기타 역할: 본인이 생성한 감사 로그만 조회
CREATE POLICY "audit_self_access" ON "audit_logs"
  FOR ALL
  USING (
    "teacherId" = current_setting('rls.teacher_id', true)
  )
  WITH CHECK (
    "teacherId" = current_setting('rls.teacher_id', true)
  );

-- -------------------------------------------------------------
-- 7. Superuser (DB owner) 우회 설정
-- PostgreSQL에서 테이블 소유자는 기본적으로 RLS를 우회합니다.
-- FORCE ROW LEVEL SECURITY를 사용하면 소유자도 RLS를 따릅니다.
-- migration 실행 시에는 superuser로 실행되므로 영향 없습니다.
--
-- 애플리케이션에서 사용하는 DB 사용자가 테이블 소유자가 아닌 경우
-- 추가 GRANT가 필요할 수 있습니다.
-- -------------------------------------------------------------
