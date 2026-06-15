import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Audits } from './pages/Audits';
import { Schemas } from './pages/Schemas';
import { SchemaDetail } from './pages/SchemaDetail';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/schemas" element={<Schemas />} />
          <Route path="/schema/:id" element={<SchemaDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;