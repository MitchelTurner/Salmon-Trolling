import { Navigate, Route, Routes } from 'react-router-dom';
import { StorageQuotaBanner } from './db/index.js';
import { CalculatorPage } from './routes/calculator/index.js';
import {
  LeaderboardPage,
  RegisterPage,
  WeighInStationPage,
} from './routes/derbies/index.js';
import { DockPage } from './routes/dock/index.js';
import { RecommendPage } from './routes/recommend/index.js';
import { GuestReportPage } from './routes/report/index.js';
import { TagStatusPage } from './routes/tag/index.js';
import { TripPage } from './routes/trip/index.js';

export function App() {
  return (
    <>
      <StorageQuotaBanner />
      <Routes>
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/trip" element={<TripPage />} />
        <Route path="/dock" element={<DockPage />} />
        <Route path="/recommend" element={<RecommendPage />} />
        <Route path="/r/:slug" element={<GuestReportPage />} />
        <Route path="/tag/:code" element={<TagStatusPage />} />
        <Route path="/derbies/:slug" element={<LeaderboardPage />} />
        <Route path="/derbies/:slug/register" element={<RegisterPage />} />
        <Route path="/derbies/:slug/station" element={<WeighInStationPage />} />
        <Route path="*" element={<Navigate to="/calculator" replace />} />
      </Routes>
    </>
  );
}
