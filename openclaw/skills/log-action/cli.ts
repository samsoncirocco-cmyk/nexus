#!/usr/bin/env npx ts-node
/**
 * CLI wrapper for log-action skill
 */

import { logAction } from './index.ts';
import type { LogActionInput } from './index.ts';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: npx ts-node cli.ts <agentId> <eventType> <source> <payloadJson>');
    process.exit(1);
  }

  const [agentId, eventType, source, payloadJson] = args;
  
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadJson);
  } catch (err) {
    console.error('Invalid JSON payload:', err);
    process.exit(1);
  }

  const input: LogActionInput = {
    agentId,
    eventType,
    source,
    payload,
  };

  console.log('Logging action...', { agentId, eventType, source });
  
  const result = await logAction(input);
  
  if (result.success) {
    console.log('✅ Action logged successfully');
    console.log('Event ID:', result.eventId);
    console.log('Timestamp:', result.timestamp);
  } else {
    console.error('❌ Failed to log action');
    console.error('Error:', result.error);
    process.exit(1);
  }
}

main();
