import { isQcCleared } from '@print-shop/utils'
import type { QcRecord } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

/** Current QC state of a job = its newest record (records are the QC history). */
export async function latestQcRecord(printerJobId: string): Promise<QcRecord | null> {
  return prisma.qcRecord.findFirst({
    where: { printerJobId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export interface JobQcClearance {
  jobId: string
  cleared: boolean
  latestStatus: QcRecord['status'] | null
}

/** QC clearance (passed or consciously overridden) per job, based on the newest record each. */
export async function jobsQcClearance(jobIds: string[]): Promise<JobQcClearance[]> {
  if (jobIds.length === 0) return []
  const records = await prisma.qcRecord.findMany({
    where: { printerJobId: { in: jobIds } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  const latestByJob = new Map<string, QcRecord>()
  for (const record of records) {
    if (!latestByJob.has(record.printerJobId)) latestByJob.set(record.printerJobId, record)
  }
  return jobIds.map((jobId) => {
    const latest = latestByJob.get(jobId) ?? null
    return {
      jobId,
      cleared: latest ? isQcCleared(latest.status) : false,
      latestStatus: latest?.status ?? null,
    }
  })
}

/** True when every given job has QC clearance. Empty list = nothing to clear. */
export async function allJobsQcCleared(jobIds: string[]): Promise<boolean> {
  const clearances = await jobsQcClearance(jobIds)
  return clearances.every((c) => c.cleared)
}
