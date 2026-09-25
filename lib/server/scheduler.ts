// In-app scheduler, started once per server from instrumentation.ts. Every 30
// minutes it runs whatever is due (lib/server/jobs.ts). Production only, unless
// ENABLE_SCHEDULER=1; DISABLE_SCHEDULER=1 turns it off (e.g. when an external
// cron calls /api/cron/* instead — running both is safe, each job runs once).

const EVERY_MS = 30 * 60 * 1000;
const globalForScheduler = globalThis as unknown as { deskSharkScheduler?: ReturnType<typeof setInterval> };

export function startScheduler() {
  if (globalForScheduler.deskSharkScheduler) return;
  const enabled = process.env.DISABLE_SCHEDULER !== '1' && (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === '1');
  if (!enabled) return;
  const tick = async () => {
    try {
      const { runDueJobs } = await import('./jobs');
      await runDueJobs();
    } catch (e) {
      console.error('[scheduler] tick failed:', e instanceof Error ? e.message : e);
    }
  };
  // First run shortly after start-up, then every 30 minutes.
  setTimeout(tick, 60_000).unref?.();
  globalForScheduler.deskSharkScheduler = setInterval(tick, EVERY_MS);
  globalForScheduler.deskSharkScheduler.unref?.();
  console.log('[scheduler] started — CA pack and outstanding reminders run automatically');
}
