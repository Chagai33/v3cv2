"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEventHash = calculateEventHash;
exports.generateEventKey = generateEventKey;
exports.withRetry = withRetry;
exports.rateLimitExecutor = rateLimitExecutor;
exports.batchProcessor = batchProcessor;
const crypto = __importStar(require("crypto"));
const functions = __importStar(require("firebase-functions"));
const p_limit_1 = __importDefault(require("p-limit"));
/**
 * Generates a unique hash for the event content to detect changes.
 * We include only the fields that should trigger an update.
 */
function calculateEventHash(event) {
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
function generateEventKey(type, year) {
    return `${type}_${year}`;
}
/**
 * Executes a promise with exponential backoff retry logic.
 * Specifically targets 403 (Rate Limit) and 429 (Too Many Requests) errors.
 */
async function withRetry(operation, maxRetries = 4, baseDelay = 1000) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            const errorCode = error.code || error.status; // Support different error objects
            // Retry only on Rate Limit errors or Server Errors that might be transient
            // 403: Rate Limit, 429: Too Many Requests
            if (errorCode === 403 || errorCode === 429) {
                if (i === maxRetries)
                    break;
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
async function rateLimitExecutor(tasks, concurrency, delayMs = 0) {
    const results = [];
    const executing = new Set();
    for (const task of tasks) {
        // Wrap the task execution
        const p = task().then((value) => {
            results.push({ status: 'fulfilled', value });
        }, (reason) => {
            results.push({ status: 'rejected', reason });
        });
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
async function batchProcessor(tasks, concurrency) {
    const limit = (0, p_limit_1.default)(concurrency);
    const promises = tasks.map(task => limit(() => task()));
    const results = await Promise.allSettled(promises);
    const successful = [];
    const failed = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            successful.push(result.value);
        }
        else {
            failed.push(result.reason);
        }
    });
    return { successful, failed };
}
//# sourceMappingURL=calendar-utils.js.map