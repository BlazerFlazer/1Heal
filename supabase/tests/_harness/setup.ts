// Runs in every db-test worker before each test file (jest.db.config.js setupFilesAfterEnv).
import { closePool } from './db';

jest.setTimeout(20_000);

afterAll(async () => {
  await closePool();
});
