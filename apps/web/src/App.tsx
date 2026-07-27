import { Navigate, Route, Routes } from 'react-router-dom';
import { StorageQuotaBanner } from './db/index.js';
import { CalculatorPage } from './routes/calculator/index.js';

export function App() {
  return (
    <>
      <StorageQuotaBanner />
      <Routes>
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="*" element={<Navigate to="/calculator" replace />} />
      </Routes>
    </>
  );
}
