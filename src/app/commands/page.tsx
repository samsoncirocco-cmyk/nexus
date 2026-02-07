import { getCommands } from '@/app/actions/commands';
import CommandsClient from '@/components/CommandsClient';

export const dynamic = 'force-dynamic';

export default async function CommandsPage() {
  const commands = await getCommands();

  return <CommandsClient commands={commands} />;
}
