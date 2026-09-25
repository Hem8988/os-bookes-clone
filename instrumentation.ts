// Runs once when a Next.js server starts: starts the background scheduler
// (monthly CA pack email, weekly outstanding reminders) on the Node.js runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if ((process.env.SESSION_SECRET || '').length < 32) {
      console.error('[security] SESSION_SECRET is missing or shorter than 32 characters — nobody can log in until it is set in .env (e.g. openssl rand -base64 32).');
    }
    const { startScheduler } = await import('./lib/server/scheduler');
    startScheduler();
  }
}
