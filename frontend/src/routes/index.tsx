import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { FactsPage } from '../pages/FactsPage';
import { HypothesesPage } from '../pages/HypothesesPage';
import { HypothesisDetailPage } from '../pages/HypothesisDetailPage';
import { NewsPage } from '../pages/NewsPage';
import { RelationsPage } from '../pages/RelationsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="facts" element={<FactsPage />} />
        <Route path="relations" element={<RelationsPage />} />
        <Route path="hypotheses" element={<HypothesesPage />} />
        <Route path="hypotheses/:id" element={<HypothesisDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
