import { Navigate, Route, Routes } from 'react-router-dom';
import { CalculatorPage } from './routes/calculator/index.js';

export function App() {
  return (
    <Routes>
      <Route path="/calculator" element={<CalculatorPage />} />
      <Route path="*" element={<Navigate to="/calculator" replace />} />
    </Routes>
  );
}
