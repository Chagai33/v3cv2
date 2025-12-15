import * as crypto from 'crypto';
import * as functions from 'firebase-functions';
import pLimit from 'p-limit';

export interface CalendarEventsMap {
  [key: string]: string; // e.g., "gregorian_2025": "eventId123"
}

export interface SyncEvent {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  extendedProperties?: {
    private: { [key: string]: string };
  };
  reminders?: {
    useDefault: boolean;
    overrides: { method: string; minutes: number }[];
  };
  _type: 'gregorian' | 'hebrew';
  _year?: number; // Used for map key generation
}

/**
 * Generates a unique hash for the event content to detect changes.
 * We include only the fields that should trigger an update.
 */
export function calculateEventHash(event: SyncEvent): string {
  const dataToHash = {
    summary: event.summary,
    description: event.description,
    start: event.start.date,
    end: event.end.date,
    // We don't hash extendedProperties as they usually don't change visually for the user
    // unless the logic changes.
  };
  return crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
}

/**
 * Generates a consistent key for the events map.
 * Format: "{type}_{year}" (e.g., "gregorian_2025", "hebrew_5786")
 */
export function generateEventKey(type: 'gregorian' | 'hebrew', year: number): string {
  return `${type}_${year}`;
}

/**
 * Executes a promise with exponential backoff retry logic.
 * Specifically targets 403 (Rate Limit) and 429 (Too Many Requests) errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorCode = error.code || error.status; // Support different error objects

      // Retry only on Rate Limit errors or Server Errors that might be transient
      // 403: Rate Limit, 429: Too Many Requests
      if (errorCode === 403 || errorCode === 429) {
        if (i === maxRetries) break;

        // Calculate delay with exponential backoff and jitter
        // Jitter helps prevent thundering herd problem
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500);
        
        functions.logger.warn(`Rate limit hit (Code ${errorCode}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors (e.g. 400, 401, 404), fail immediately
      throw error;
    }
  }

  throw lastError;
}

/**
 * Robust rate limit executor using Set to manage strict concurrency.
 * Ensures no more than `concurrency` tasks are running at once.
 */
export async function rateLimitExecutor<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  delayMs: number = 0
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    // Wrap the task execution
    const p = task().then(
      (value) => {
        results.push({ status: 'fulfilled', value });
      },
      (reason) => {
        results.push({ status: 'rejected', reason });
      }
    );

    // Add to executing set
    executing.add(p);

    // Remove from executing set when done
    const cleanUp = () => executing.delete(p);
    p.then(cleanUp, cleanUp);

    // If we reached concurrency limit, wait for at least one to finish
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }

    // Optional delay between task starts to spread out load
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Wait for all remaining tasks to finish
  await Promise.all(executing);
  return results;
}

/**
 * Processes a batch of tasks with concurrency limit and separates results.
 */
export async function batchProcessor<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<{ successful: T[]; failed: any[] }> {
  const limit = pLimit(concurrency);
  const promises = tasks.map(task => limit(() => task()));
  
  const results = await Promise.allSettled(promises);
  
  const successful: T[] = [];
  const failed: any[] = [];
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push(result.reason);
    }
  });
  
  return { successful, failed };
}
