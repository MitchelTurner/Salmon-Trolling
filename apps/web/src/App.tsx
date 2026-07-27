import { Navigate, Route, Routes } from 'react-router-dom';
import { StorageQuotaBanner } from './db/index.js';
import { CalculatorPage } from './routes/calculator/index.js';
import { DockPage } from './routes/dock/index.js';
import { TripPage } from './routes/trip/index.js';

export function App() {
  return (
    <>
      <StorageQuotaBanner />
      <Routes>
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/trip" element={<TripPage />} />
        <Route path="/dock" element={<DockPage />} />
        <Route path="*" element={<Navigate to="/calculator" replace />} />
      </Routes>
    </>
  );
}
