import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import RequireAuth from "@/components/auth/RequireAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CountryView from "./pages/CountryView";
import PoliticianNew from "./pages/PoliticianNew";
import PoliticianDetail from "./pages/PoliticianDetail";
import ElectionsPage from "./pages/ElectionsPage";
import LegislationPage from "./pages/LegislationPage";
import NotFound from "./pages/NotFound";

const Protected = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>{children}</RequireAuth>
);

export default function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" richColors closeButton />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/countries/:id" element={<Protected><CountryView /></Protected>} />
            <Route path="/politicians/new" element={<Protected><PoliticianNew /></Protected>} />
            <Route path="/politicians/:id" element={<Protected><PoliticianDetail /></Protected>} />
            <Route path="/elections" element={<Protected><ElectionsPage /></Protected>} />
            <Route path="/legislation" element={<Protected><LegislationPage /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}