import { getActivity } from '@/app/actions/activity';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const activity = await getActivity();

  return <ActivityFeed initialEntries={activity} />;
}
