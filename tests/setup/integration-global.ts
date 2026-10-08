/**
 * @file tests/setup/integration-global.ts
 * @desc The integration project's globalSetup: one in-memory MongoDB replica set for the run (a
 *       single member, so bracket writes can use transactions; next-kit's startMemoryMongo
 *       starts a standalone server), its URI handed to the workers as inject("mongoUri").
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/**
 * @function setup
 * @param project {TestProject} the integration project
 * @returns {Promise<() => Promise<void>>} the teardown that stops the replica set
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide("mongoUri", replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
