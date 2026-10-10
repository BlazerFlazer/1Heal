/**
 * Structured logging for Edge Functions: one JSON object per line, so the Supabase log explorer
 * can filter by `event`, `provider`, `phone_masked`, `ms`. Never log a phone number in clear or an
 * OTP (the mock SMS provider is the one deliberate exception, dev only).
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface LogEntry extends LogFields {
  level: LogLevel;
  event: string;
}

export interface Logger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
}

export function createConsoleLogger(write: (line: string) => void = writeToConsole): Logger {
  return {
    log(level, event, fields = {}) {
      write(JSON.stringify({ ...fields, level, event, ts: new Date().toISOString() }));
    },
  };
}

/** Collects entries for assertions in tests. */
export function createMemoryLogger(): Logger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    log(level, event, fields = {}) {
      entries.push({ ...fields, level, event });
    },
  };
}

function writeToConsole(line: string): void {
  console.log(line);
}
