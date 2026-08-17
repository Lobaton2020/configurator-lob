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
import { Domains } from './pages/Domains';
import { DomainDetail } from './pages/DomainDetail';
import { Login } from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';

const GOOGLE_CLIENT_ID_FALLBACK =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? '';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID_FALLBACK}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/audits"
              element={
                <RequireAuth>
                  <Layout>
                    <Audits />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/schemas"
              element={
                <RequireAuth>
                  <Layout>
                    <Schemas />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/schema/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <SchemaDetail />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/scoops"
              element={
                <RequireAuth>
                  <Layout>
                    <Scoops />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/scoops/new"
              element={
                <RequireAuth>
                  <Layout>
                    <ScoopNew />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/cluster"
              element={
                <RequireAuth>
                  <Layout>
                    <Cluster />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/scoops/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <ScoopDetail />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/configstore"
              element={
                <RequireAuth>
                  <Layout>
                    <ConfigStore />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/secrets"
              element={
                <RequireAuth>
                  <Layout>
                    <Secrets />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/apps"
              element={
                <RequireAuth>
                  <Layout>
                    <Apps />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/domains"
              element={
                <RequireAuth>
                  <Layout>
                    <Domains />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/domains/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <DomainDetail />
                  </Layout>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;