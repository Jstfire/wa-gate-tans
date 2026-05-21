import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { blast_jobs_wagate, blast_recipients_wagate } from '../db/schema/blast'
import type { BlastJob, BlastRecipient } from '../db/schema/blast'
import { waClientManager } from './wa-client'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Returns a random delay between 60 and 90 seconds in milliseconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 30000) + 60000
}

export class BlastEngine {
  private static instance: BlastEngine
  private isPolling = false
  private pollInterval: ReturnType<typeof setInterval> | null = null

  private constructor() {}

  static getInstance(): BlastEngine {
    if (!BlastEngine.instance) {
      BlastEngine.instance = new BlastEngine()
    }
    return BlastEngine.instance
  }

  start(): void {
    if (this.isPolling) return
    this.isPolling = true
    this.pollInterval = setInterval(() => {
      this.pollJobs().catch((err) => console.error('[Blast] Poll error:', err))
    }, 10_000)
    console.log('[Blast] Engine started, polling every 10s')
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.isPolling = false
    console.log('[Blast] Engine stopped')
  }

  private async pollJobs(): Promise<void> {
    const jobs = await db
      .select()
      .from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.status, 'queued'))
      .limit(1)

    for (const job of jobs) {
      await this.processJob(job)
    }
  }

  private async processJob(job: BlastJob): Promise<void> {
    console.log(`[Blast] Starting job ${job.id}: ${job.name}`)

    await db
      .update(blast_jobs_wagate)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(blast_jobs_wagate.id, job.id))

    const recipients = await db
      .select()
      .from(blast_recipients_wagate)
      .where(
        and(
          eq(blast_recipients_wagate.jobId, job.id),
          eq(blast_recipients_wagate.status, 'pending')
        )
      )

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]

      // Check if job is still running before each send
      const currentJob = await this.getJobStatus(job.id)
      if (!currentJob || currentJob.status !== 'running') {
        console.log(`[Blast] Job ${job.id} halted (status: ${currentJob?.status ?? 'unknown'})`)
        return
      }

      await this.sendToRecipient(job, recipient)

      // Wait 60–90s between sends; skip delay after the last recipient
      if (i < recipients.length - 1) {
        const delay = randomDelay()
        console.log(`[Blast] Waiting ${Math.round(delay / 1000)}s before next recipient`)
        await sleep(delay)
      }
    }

    // Mark completed only if still running (not cancelled mid-way)
    const finalJob = await this.getJobStatus(job.id)
    if (finalJob?.status === 'running') {
      await db
        .update(blast_jobs_wagate)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(blast_jobs_wagate.id, job.id))
      console.log(`[Blast] Job ${job.id} completed`)
    }
  }

  private async sendToRecipient(job: BlastJob, recipient: BlastRecipient): Promise<void> {
    await db
      .update(blast_recipients_wagate)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(blast_recipients_wagate.id, recipient.id))

    try {
      await waClientManager.sendMessage(recipient.phoneNumber, job.messageContent)

      await db
        .update(blast_recipients_wagate)
        .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
        .where(eq(blast_recipients_wagate.id, recipient.id))

      await db
        .update(blast_jobs_wagate)
        .set({
          sentCount: sql`${blast_jobs_wagate.sentCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(blast_jobs_wagate.id, job.id))

      console.log(`[Blast] Sent to ${recipient.phoneNumber}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[Blast] Failed to send to ${recipient.phoneNumber}:`, errorMessage)

      await db
        .update(blast_recipients_wagate)
        .set({ status: 'failed', errorMessage, updatedAt: new Date() })
        .where(eq(blast_recipients_wagate.id, recipient.id))

      await db
        .update(blast_jobs_wagate)
        .set({
          failedCount: sql`${blast_jobs_wagate.failedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(blast_jobs_wagate.id, job.id))
    }
  }

  private async getJobStatus(jobId: string): Promise<BlastJob | null> {
    const rows = await db
      .select()
      .from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, jobId))
      .limit(1)
    return rows[0] ?? null
  }
}

export const blastEngine = BlastEngine.getInstance()

export function startBlastEngine(): void {
  blastEngine.start()
}
