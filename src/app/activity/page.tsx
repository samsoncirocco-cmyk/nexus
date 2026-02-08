import { getMergedActivity } from '@/app/actions/activity';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const activity = await getMergedActivity();

  return <ActivityFeed initialEntries={activity} />;
}
