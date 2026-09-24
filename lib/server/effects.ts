import { after } from 'next/server';

/**
 * Side effects (WhatsApp, email, push) collected during a request and run
 * only after the database transaction has committed and the response is sent.
 */
export class Effects {
  private jobs: Array<{ label: string; run: () => Promise<unknown> }> = [];

  add(label: string, run: () => Promise<unknown>) {
    this.jobs.push({ label, run });
  }

  async flush() {
    const jobs = this.jobs;
    this.jobs = [];
    for (const job of jobs) {
      try {
        await job.run();
      } catch (error) {
        console.error(`[effects] ${job.label} failed`, error);
      }
    }
  }

  /** Run after the response; falls back to immediate execution outside a request. */
  schedule() {
    if (!this.jobs.length) return;
    try {
      after(() => this.flush());
    } catch {
      void this.flush();
    }
  }
}
