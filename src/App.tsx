import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import { FullPageLoader, ProtectedRoute } from "./components/layout/ProtectedRoute";

// public
const Home = lazy(() => import("./pages/public/Home"));
const Services = lazy(() => import("./pages/public/Services"));
const Barbers = lazy(() => import("./pages/public/Barbers"));
const BarberProfile = lazy(() => import("./pages/public/BarberProfile"));
const Gallery = lazy(() => import("./pages/public/Gallery"));
const Book = lazy(() => import("./pages/public/Book"));
const Login = lazy(() => import("./pages/public/Auth").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/public/Auth").then((m) => ({ default: m.Register })));
const NotFound = lazy(() => import("./pages/public/NotFound"));

// dashboard
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const Planning = lazy(() => import("./pages/dashboard/Planning"));
const Appointments = lazy(() => import("./pages/dashboard/Appointments"));
const History = lazy(() => import("./pages/dashboard/History"));
const Clients = lazy(() => import("./pages/dashboard/Clients"));
const ClientDetail = lazy(() => import("./pages/dashboard/ClientDetail"));
const Portfolio = lazy(() => import("./pages/dashboard/Portfolio"));
const Reviews = lazy(() => import("./pages/dashboard/Reviews"));
const ServicesAdmin = lazy(() => import("./pages/dashboard/ServicesAdmin"));
const Team = lazy(() => import("./pages/dashboard/Team"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const Caisse = lazy(() => import("./pages/dashboard/Caisse"));
const Terminal = lazy(() => import("./pages/pos/Terminal"));
const SiteEditor = lazy(() => import("./pages/dashboard/site/SiteEditor"));

export default function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname === "/login" || pathname === "/register" ? pathname : "app"}>
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="barbers" element={<Barbers />} />
          <Route path="barbers/:id" element={<BarberProfile />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="book" element={<Book />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="caisse" element={<ProtectedRoute roles={["owner", "manager"]}><Terminal /></ProtectedRoute>} />
        </Route>

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="history" element={<ProtectedRoute roles={["client"]}><History /></ProtectedRoute>} />
          <Route path="profile" element={<Profile />} />
          <Route path="planning" element={<ProtectedRoute roles={["owner", "manager", "barber"]}><Planning /></ProtectedRoute>} />
          <Route path="clients" element={<ProtectedRoute roles={["owner", "manager", "barber"]}><Clients /></ProtectedRoute>} />
          <Route path="clients/:id" element={<ProtectedRoute roles={["owner", "manager", "barber"]}><ClientDetail /></ProtectedRoute>} />
          <Route path="portfolio" element={<ProtectedRoute roles={["owner", "manager", "barber"]}><Portfolio /></ProtectedRoute>} />
          <Route path="reviews" element={<ProtectedRoute roles={["owner", "manager", "barber"]}><Reviews /></ProtectedRoute>} />
          <Route path="services" element={<ProtectedRoute roles={["owner", "manager"]}><ServicesAdmin /></ProtectedRoute>} />
          <Route path="caisse" element={<ProtectedRoute roles={["owner", "manager"]}><Caisse /></ProtectedRoute>} />
          <Route path="team" element={<ProtectedRoute roles={["owner", "manager"]}><Team /></ProtectedRoute>} />
          <Route path="site" element={<ProtectedRoute roles={["owner"]}><SiteEditor /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
