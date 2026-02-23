/**
 * 시드 리셋 로직 (FK 역순 삭제)
 */

import type { Prisma } from '@/lib/db'
import type { SeedGroup } from "./constants"

/** FK 역순으로 안전하게 삭제 */
const DELETE_ORDER: SeedGroup[] = [
  'parents', 'students', 'teachers', 'teams', 'providers',
  'featureMappings', 'providerTemplates',
]

export async function executeReset(
  tx: Prisma.TransactionClient,
  groups: SeedGroup[],
  resetGroups: Set<SeedGroup>,
  excludeTeacherId?: string,
): Promise<void> {
  for (const group of DELETE_ORDER) {
    if (!resetGroups.has(group) || !groups.includes(group)) continue

    switch (group) {
      case 'parents':
        await tx.parent.deleteMany()
        break
      case 'students':
        await tx.student.deleteMany()
        break
      case 'teachers': {
        if (excludeTeacherId) {
          const notMe = { NOT: { performedBy: excludeTeacherId } }
          await tx.issueEvent.deleteMany({ where: notMe })
          await tx.issue.deleteMany({ where: { NOT: { createdBy: excludeTeacherId } } })
          await tx.assignmentProposal.deleteMany({ where: { NOT: { proposedBy: excludeTeacherId } } })
          await tx.passwordResetToken.deleteMany({ where: { NOT: { teacherId: excludeTeacherId } } })
          await tx.teacher.deleteMany({ where: { NOT: { id: excludeTeacherId } } })
        } else {
          await tx.issueEvent.deleteMany()
          await tx.issue.deleteMany()
          await tx.assignmentProposal.deleteMany()
          await tx.passwordResetToken.deleteMany()
          await tx.teacher.deleteMany()
        }
        break
      }
      case 'teams':
        await tx.team.deleteMany()
        break
      case 'providers':
        await tx.provider.deleteMany()
        break
      case 'providerTemplates':
        await tx.providerTemplate.deleteMany()
        break
      case 'featureMappings':
        await tx.featureMapping.deleteMany()
        break
    }
  }
}
