import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { Home } from './pages/Home';
import { Health } from './pages/Health';
import { MetaModelCategories } from './pages/MetaModelCategories';
import { MetaModelGroups } from './pages/MetaModelGroups';
import { MetaModelModels } from './pages/MetaModelModels';
import { ResourcesExplorer } from './pages/ResourcesExplorer';
import { TagsPage } from './pages/TagsPage';
import { GlobalSearchPage } from './pages/GlobalSearchPage';
import { AppsExplorer } from './pages/AppsExplorer';
import { SyncPage } from './pages/SyncPage';
import { AuditPage } from './pages/AuditPage';
import { LoginPage } from './pages/LoginPage';
import { RelationsPage } from './pages/RelationsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TrashPage } from './pages/TrashPage';
import { DashboardPage } from './pages/DashboardPage';
import { IpamPage } from './pages/IpamPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { ModelTemplatesPage } from './pages/ModelTemplatesPage';
import { BulkIoPage } from './pages/BulkIoPage';
import { RoomsPage } from './pages/RoomsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'health', element: <Health /> },
      // v0.1
      { path: 'meta-model/categories', element: <MetaModelCategories /> },
      { path: 'meta-model/groups', element: <MetaModelGroups /> },
      { path: 'meta-model/models', element: <MetaModelModels /> },
      { path: 'resources', element: <ResourcesExplorer /> },
      { path: 'tags', element: <TagsPage /> },
      { path: 'search', element: <GlobalSearchPage /> },
      { path: 'apps', element: <AppsExplorer /> },
      { path: 'sync', element: <SyncPage /> },
      { path: 'audit', element: <AuditPage /> },
      // v0.2
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'relations', element: <RelationsPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'trash', element: <TrashPage /> },
      { path: 'ipam', element: <IpamPage /> },
      { path: 'discovery', element: <DiscoveryPage /> },
      { path: 'model-templates', element: <ModelTemplatesPage /> },
      { path: 'bulk-io', element: <BulkIoPage /> },
      { path: 'rooms', element: <RoomsPage /> },
    ],
  },
]);
