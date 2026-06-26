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
import Run from "./pages/Run";
import NotFound from "./pages/NotFound";
import CabinetOffice from "./pages/CabinetOffice";
import CabinetOfficeDetail from "./pages/CabinetOfficeDetail";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/countries/:id" element={<RequireAuth><CountryView /></RequireAuth>} />
            <Route path="/politicians/new" element={<RequireAuth><PoliticianNew /></RequireAuth>} />
            <Route path="/politicians/:id" element={<RequireAuth><PoliticianDetail /></RequireAuth>} />
            <Route path="/elections" element={<RequireAuth><ElectionsPage /></RequireAuth>} />
            <Route path="/legislation" element={<LegislationPage />} />
            <Route path="/run" element={<Run />} />
            <Route path="/cabinet" element={<CabinetOffice />} />
            <Route path="/cabinet/:id" element={<CabinetOfficeDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
