import type { PrismaClient } from '@prisma/client';

export async function seedAgentConfigs(prisma: PrismaClient) {
  // 상대 경로로 워크플로우 import (시드 CLI 컨텍스트에서 @/ alias 미지원 가능)
  const { studentProfilingWorkflowA } = await import('../../../../../features/agents/workflows/student-profiling-workflow');
  const { gradeAnalysisWorkflowA } = await import('../../../../../features/agents/workflows/grade-analysis-workflow');
  const { counselingAssistantWorkflowA } = await import('../../../../../features/agents/workflows/counseling-assistant-workflow');

  const agents = [
    {
      type: 'STUDENT_PROFILING' as const,
      name: '학생 프로파일링',
      description: '학생 등록 시 자동으로 사주, 이름 분석을 수행하고, 설문 완료 시 통합 프로파일을 생성합니다.',
      workflow: studentProfilingWorkflowA as object,
    },
    {
      type: 'GRADE_ANALYSIS' as const,
      name: '성적 분석',
      description: '성적 이미지 업로드 시 자동 OCR, 코칭 리포트, 학부모 리포트를 생성합니다.',
      workflow: gradeAnalysisWorkflowA as object,
    },
    {
      type: 'COUNSELING_ASSISTANT' as const,
      name: '상담 어시스턴트',
      description: '상담 예약 시 사전 준비 자료를 생성하고, 상담 완료 시 자동 요약을 작성합니다.',
      workflow: counselingAssistantWorkflowA as object,
    },
    {
      type: 'MATCHING_OPTIMIZER' as const,
      name: '매칭 최적화',
      description: '교사-학생 배정을 최적화하고 공정성을 검증합니다. (Phase 2)',
      workflow: { nodes: [], edges: [] },
    },
    {
      type: 'REPORT_ORCHESTRATOR' as const,
      name: '리포트 오케스트레이터',
      description: '데이터 변경 시 자동으로 PDF 리포트를 생성하고 발송합니다. (Phase 2)',
      workflow: { nodes: [], edges: [] },
    },
  ];

  for (const agent of agents) {
    await prisma.agentConfig.upsert({
      where: { type: agent.type },
      create: {
        type: agent.type,
        name: agent.name,
        description: agent.description,
        enabled: false,
        workflow: agent.workflow,
        settings: {},
      },
      update: {
        name: agent.name,
        description: agent.description,
        workflow: agent.workflow,
      },
    });
  }

  console.log('  ✓ Agent configs seeded (5 agents)');
}
