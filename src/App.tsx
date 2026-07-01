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
import Politicians from "./pages/Politicians";
import ElectionsPage from "./pages/ElectionsPage";
import LegislationPage from "./pages/LegislationPage";
import World from "./pages/World";
import Markets from "./pages/Markets";
import Wiki from "./pages/Wiki";
import Run from "./pages/Run";
import Profile from "./pages/Profile";
import ActionsHub from "./pages/ActionsHub";
import NotFound from "./pages/NotFound";
import CabinetOffice from "./pages/CabinetOffice";
import CabinetOfficeDetail from "./pages/CabinetOfficeDetail";
import Polls from "./pages/Polls";

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
            <Route path="/politicians" element={<Politicians />} />
            <Route path="/politicians/new" element={<RequireAuth><PoliticianNew /></RequireAuth>} />
            <Route path="/politicians/:id" element={<PoliticianDetail />} />
            <Route path="/countries/:id" element={<CountryView />} />
            <Route path="/elections" element={<ElectionsPage />} />
            <Route path="/legislation" element={<LegislationPage />} />
            <Route path="/world" element={<World />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/wiki" element={<Wiki />} />
            <Route path="/run" element={<RequireAuth><Run /></RequireAuth>} />
            <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/actions/:id" element={<RequireAuth><ActionsHub /></RequireAuth>} />
            <Route path="/cabinet" element={<CabinetOffice />} />
            <Route path="/cabinet/:id" element={<CabinetOfficeDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
