import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Audits } from './pages/Audits';
import { Schemas } from './pages/Schemas';
import { SchemaDetail } from './pages/SchemaDetail';
import { Scoops } from './pages/Scoops';
import { ScoopNew } from './pages/ScoopNew';
import { ScoopDetail } from './pages/ScoopDetail';
import { Cluster } from './pages/Cluster';
import { ConfigStore } from './pages/ConfigStore';
import { Secrets } from './pages/Secrets';
import { Apps } from './pages/Apps';
import { AppDetail } from './pages/AppDetail';
import { Domains } from './pages/Domains';
import { DomainDetail } from './pages/DomainDetail';
import { Login } from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { WorkspaceProvider } from './auth/WorkspaceContext';
import { RequireWorkspace } from './auth/WorkspaceRequire';

const GOOGLE_CLIENT_ID_FALLBACK =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? '';

function Protected() {
  return (
    <RequireAuth>
      <RequireWorkspace />
    </RequireAuth>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID_FALLBACK}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Protected />}>
                <Route path="/" element={<Layout><Dashboard /></Layout>} />
                <Route path="/audits" element={<Layout><Audits /></Layout>} />
                <Route path="/schemas" element={<Layout><Schemas /></Layout>} />
                <Route path="/schema/:id" element={<Layout><SchemaDetail /></Layout>} />
                <Route path="/scoops" element={<Layout><Scoops /></Layout>} />
                <Route path="/scoops/new" element={<Layout><ScoopNew /></Layout>} />
                <Route path="/cluster" element={<Layout><Cluster /></Layout>} />
                <Route path="/scoops/:id" element={<Layout><ScoopDetail /></Layout>} />
                <Route path="/configstore" element={<Layout><ConfigStore /></Layout>} />
                <Route path="/secrets" element={<Layout><Secrets /></Layout>} />
                <Route path="/apps" element={<Layout><Apps /></Layout>} />
                <Route path="/apps/:id" element={<Layout><AppDetail /></Layout>} />
                <Route path="/domains" element={<Layout><Domains /></Layout>} />
                <Route path="/domains/:id" element={<Layout><DomainDetail /></Layout>} />
              </Route>
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;