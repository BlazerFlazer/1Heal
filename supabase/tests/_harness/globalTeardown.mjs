/** Jest globalTeardown for the db project: stops the embedded PostgreSQL started by globalSetup. */
export default async function globalTeardown() {
  const db = globalThis.__ONEHEAL_EMBEDDED_DB__;
  if (db) {
    globalThis.__ONEHEAL_EMBEDDED_DB__ = undefined;
    await db.stop();
  }
}
