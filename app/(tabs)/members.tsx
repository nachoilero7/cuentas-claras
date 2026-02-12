export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import { Redirect } from 'expo-router';

export default function MembersTab() {
  return <Redirect href="/members" />;
}
