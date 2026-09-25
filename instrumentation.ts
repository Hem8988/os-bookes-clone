// Runs once when a Next.js server starts: starts the background scheduler
// (monthly CA pack email, weekly outstanding reminders) on the Node.js runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/server/scheduler');
    startScheduler();
  }
}
