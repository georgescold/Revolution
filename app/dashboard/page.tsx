import { AnalyticsView } from '@/components/analytics/analytics-view';
import { CollectionsView } from '@/components/collections/collections-view';
import { CreationView } from '@/components/creation/creation-view';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

export default async function DashboardPage() {
    return (
        <DashboardTabs
            analyticsContent={<AnalyticsView />}
            collectionsContent={<CollectionsView />}
            creationContent={<CreationView />}
        />
    );
}
