"use server"

import { verifySession, logAuditAction } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { IssueSchema, type IssueFormState } from "@/lib/validations/issues"
import { createGitHubIssue, ensureLabel, createIssueBranch, generateIssueBody, dispatchAutoFix } from "@/lib/github/services"
import { CATEGORY_LABEL_MAP } from "@/lib/github/constants"
import { isGitHubConfigured } from "@/lib/github/client"
import { Prisma, type IssueCategory, type IssuePriority, type IssueStatus } from '@/lib/db'
import { okVoid, fail, type ActionVoidResult } from "@/lib/errors/action-result"

/** getIssues에서 include 옵션에 맞는 Issue 타입 */
type IssueWithRelations = Prisma.IssueGetPayload<{
  include: {
    creator: { select: { id: true; name: true; email: true } }
    assignee: { select: { id: true; name: true; email: true } }
    events: {
      include: {
        performer: { select: { id: true; name: true } }
      }
    }
  }
}>

/**
 * 이슈 생성 Server Action
 *
 * DIRECTOR만 이슈를 생성할 수 있음
 * DB 저장 → GitHub Issue 생성 → 라벨 태깅 → 브랜치 생성 → IssueEvent 기록 → AuditLog 기록
 */
export async function createIssue(
  prevState: IssueFormState,
  formData: FormData
): Promise<IssueFormState> {
  // Step 1: 인증 + DIRECTOR 권한 체크
  const session = await verifySession()
  if (session.role !== 'DIRECTOR') {
    return {
      errors: { _form: ["이슈를 생성할 권한이 없어요"] },
      success: false,
    }
  }

  // Step 2: Zod 검증
  const validatedFields = IssueSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority") || 'MEDIUM',
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { title, description, category, priority } = validatedFields.data

  // Step 2.5: 스크린샷 및 사용자 컨텍스트 추출
  const screenshotUrl = formData.get("screenshotUrl") as string | null
  const userContextJson = formData.get("userContext") as string | null
  let userContext: { role: string; url: string; timestamp: string } | undefined
  
  if (userContextJson) {
    try {
      userContext = JSON.parse(userContextJson)
    } catch {
      // 파싱 실패 시 무시
    }
  }

  try {
    // Step 3: DB에 이슈 저장 (먼저 DB에 저장하여 GitHub 실패와 무관하게 이슈 보존)
    const issue = await db.issue.create({
      data: {
        title,
        description: description || null,
        category: category as IssueCategory,
        priority: (priority || 'MEDIUM') as IssuePriority,
        createdBy: session.userId,
        screenshotUrl: screenshotUrl || null,
        userContext: (userContext as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    })

    // Step 4: GitHub 연동 (isGitHubConfigured() 체크 후)
    let githubIssueNumber: number | null = null
    let githubIssueUrl: string | null = null
    let githubBranchName: string | null = null
    let partialGitHubFailure = false

    if (isGitHubConfigured()) {
      try {
        // 생성자 이름 조회
        const creator = await db.teacher.findUnique({
          where: { id: session.userId },
          select: { name: true },
        })

        // 카테고리 라벨 생성 (실패해도 진행)
        const categoryLabel = CATEGORY_LABEL_MAP[category as IssueCategory]
        await ensureLabel(categoryLabel)

        // GitHub Issue 본문 생성
        const body = generateIssueBody({
          title,
          description: description || undefined,
          category: category as IssueCategory,
          priority,
          creatorName: creator?.name || 'Unknown',
          screenshotUrl: screenshotUrl || undefined,
          userContext: userContext || undefined,
        })

        // GitHub Issue 생성
        const githubIssue = await createGitHubIssue({
          title,
          body,
          labels: [categoryLabel],
        })

        if (githubIssue) {
          githubIssueNumber = githubIssue.number
          githubIssueUrl = githubIssue.htmlUrl

          // IssueEvent 기록: created
          await db.issueEvent.create({
            data: {
              issueId: issue.id,
              eventType: 'created',
              performedBy: session.userId,
              metadata: {
                githubIssueNumber: githubIssue.number,
                githubIssueUrl: githubIssue.htmlUrl,
              },
            },
          })

          // IssueEvent 기록: labeled (라벨 태깅 성공 시)
          await db.issueEvent.create({
            data: {
              issueId: issue.id,
              eventType: 'labeled',
              performedBy: session.userId,
              metadata: {
                labels: [categoryLabel],
              },
            },
          })

          // 브랜치 생성
          const branchName = await createIssueBranch({
            issueNumber: githubIssue.number,
            title,
            category: category as IssueCategory,
          })

          if (branchName) {
            githubBranchName = branchName

            // IssueEvent 기록: branch_created
            await db.issueEvent.create({
              data: {
                issueId: issue.id,
                eventType: 'branch_created',
                performedBy: session.userId,
                metadata: {
                  branchName,
                },
              },
            })

            // 자동 수정 파이프라인 트리거
            if (githubIssueNumber) {
              await dispatchAutoFix({
                issueNumber: githubIssueNumber,
                branchName,
                category: category as IssueCategory,
                title,
                description: description || undefined,
                screenshotUrl: screenshotUrl || undefined,
                issueId: issue.id,
              })
            }
          } else {
            partialGitHubFailure = true
          }
        } else {
          partialGitHubFailure = true
        }
      } catch (githubError) {
        // GitHub 연동 실패: DB 이슈는 생성된 상태 유지
        console.error('GitHub integration failed:', githubError)
        partialGitHubFailure = true
      }

      // GitHub 연동 결과로 DB 업데이트
      await db.issue.update({
        where: { id: issue.id },
        data: {
          githubIssueNumber,
          githubIssueUrl,
          githubBranchName,
        },
      })
    }

    // Step 5: AuditLog 기록
    await logAuditAction({
      action: 'ISSUE_CREATED',
      entityType: 'Issue',
      entityId: issue.id,
      changes: {
        title,
        category,
        priority,
        githubIssueNumber,
        githubIssueUrl,
        githubBranchName,
      },
    })

    // Step 6: 결과 반환
    if (partialGitHubFailure) {
      return {
        success: true,
        message: "이슈가 생성되었어요 (GitHub 연동 일부 실패)",
        issueId: issue.id,
      }
    }

    return {
      success: true,
      message: "이슈가 생성되었어요",
      issueId: issue.id,
    }
  } catch (error) {
    console.error("Failed to create issue:", error)
    return {
      errors: {
        _form: ["이슈 생성 중 오류가 발생했어요"],
      },
    }
  }
}

/**
 * 이슈 목록 조회 Server Action
 *
 * DIRECTOR 전용
 * 페이지네이션, 상태 필터, 카테고리 필터 지원
 */
export async function getIssues(params?: {
  status?: IssueStatus
  category?: IssueCategory
  page?: number
  pageSize?: number
}): Promise<{ issues: IssueWithRelations[]; total: number }> {
  const session = await verifySession()

  // 권한 검증: DIRECTOR 전용
  if (session.role !== 'DIRECTOR') {
    throw new Error("이슈를 조회할 권한이 없어요")
  }

  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const skip = (page - 1) * pageSize

  const where = {
    ...(params?.status && { status: params.status }),
    ...(params?.category && { category: params.category }),
  }

  const [issues, total] = await Promise.all([
    db.issue.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        events: {
          include: {
            performer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.issue.count({ where }),
  ])

  return { issues, total }
}

/**
 * 단일 이슈 조회 Server Action
 *
 * DIRECTOR 전용
 * IssueEvent 포함 조회
 */
export async function getIssueById(id: string) {
  const session = await verifySession()

  // 권한 검증: DIRECTOR 전용
  if (session.role !== 'DIRECTOR') {
    throw new Error("이슈를 조회할 권한이 없어요")
  }

  const issue = await db.issue.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      events: {
        include: {
          performer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return issue
}

/**
 * 이슈 상태 변경 Server Action
 *
 * DIRECTOR 전용
 * 상태 변경 + IssueEvent 기록 + AuditLog
 */
export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus
): Promise<ActionVoidResult> {
  const session = await verifySession()

  // 권한 검증: DIRECTOR 전용
  if (session.role !== 'DIRECTOR') {
    return fail("이슈 상태를 변경할 권한이 없어요")
  }

  try {
    // 이슈 존재 확인
    const issue = await db.issue.findUnique({
      where: { id: issueId },
    })

    if (!issue) {
      return fail("이슈를 찾을 수 없어요")
    }

    // 상태 변경
    await db.issue.update({
      where: { id: issueId },
      data: {
        status,
        ...(status === 'CLOSED' && { closedAt: new Date() }),
      },
    })

    // IssueEvent 기록
    await db.issueEvent.create({
      data: {
        issueId,
        eventType: 'status_changed',
        performedBy: session.userId,
        metadata: {
          from: issue.status,
          to: status,
        },
      },
    })

    // AuditLog 기록
    await logAuditAction({
      action: 'ISSUE_STATUS_CHANGED',
      entityType: 'Issue',
      entityId: issueId,
      changes: {
        from: issue.status,
        to: status,
      },
    })

    return okVoid()
  } catch (error) {
    console.error("Failed to update issue status:", error)
    return fail("이슈 상태 변경 중 오류가 발생했어요")
  }
}

/**
 * 이슈 담당자 할당 Server Action
 *
 * DIRECTOR 전용
 * 담당자 변경 + IssueEvent 기록 + AuditLog
 */
export async function assignIssue(
  issueId: string,
  assignedTo: string | null
): Promise<ActionVoidResult> {
  const session = await verifySession()

  if (session.role !== 'DIRECTOR') {
    return fail("이슈 담당자를 변경할 권한이 없어요")
  }

  try {
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      select: { assignedTo: true },
    })

    if (!issue) {
      return fail("이슈를 찾을 수 없어요")
    }

    await db.issue.update({
      where: { id: issueId },
      data: { assignedTo },
    })

    await db.issueEvent.create({
      data: {
        issueId,
        eventType: 'assigned',
        performedBy: session.userId,
        metadata: {
          from: issue.assignedTo,
          to: assignedTo,
        },
      },
    })

    await logAuditAction({
      action: 'ISSUE_ASSIGNED',
      entityType: 'Issue',
      entityId: issueId,
      changes: {
        from: issue.assignedTo,
        to: assignedTo,
      },
    })

    return okVoid()
  } catch (error) {
    console.error("Failed to assign issue:", error)
    return fail("담당자 변경 중 오류가 발생했어요")
  }
}
