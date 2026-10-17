import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import ClientLayout from '@/layouts/ClientLayout'
import TransporteurLayout from '@/layouts/TransporteurLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { RequireRole } from '@/features/auth/useAuth'
import HomePage from '@/pages/public/HomePage'
import SearchPage from '@/pages/public/SearchPage'
import TransportDetailPage from '@/pages/public/TransportDetailPage'
import DesignSystemPage from '@/pages/public/DesignSystemPage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '@/pages/public/AuthPages'
import { AboutPage, ContactPage, HowItWorksPage, ServicesPage } from '@/pages/public/StaticPages'
import { EvaluationsPage, HistoryPage, MessagesPage, NotificationsPage, ProfilePage } from '@/pages/shared/SharedPages'
const page = <T extends object>(load: () => Promise<T>, key: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[key] as unknown as React.ComponentType })))

// Pages légales : chargées à la demande pour garder le site public léger.
const MentionsLegalesPage = page(() => import('@/pages/public/legal/MentionsLegalesPage'), 'default')
const CguPage = page(() => import('@/pages/public/legal/CguPage'), 'default')
const ConditionsCommercialesPage = page(() => import('@/pages/public/legal/ConditionsCommercialesPage'), 'default')
const PolitiqueConfidentialitePage = page(() => import('@/pages/public/legal/PolitiqueConfidentialitePage'), 'default')
const PolitiqueCookiesPage = page(() => import('@/pages/public/legal/PolitiqueCookiesPage'), 'default')
const ChartePage = page(() => import('@/pages/public/legal/ChartePage'), 'default')

// Chaque espace est chargé à la demande : le site public reste léger sur mobile.
const ClientDashboard = page(() => import('@/pages/client/ClientDashboard'), 'default')
const ClientRequestsPage = page(() => import('@/pages/client/ClientRequests'), 'ClientRequestsPage')
const NewRequestPage = page(() => import('@/pages/client/ClientRequests'), 'NewRequestPage')
const RequestDetailPage = page(() => import('@/pages/client/ClientRequests'), 'RequestDetailPage')
const ClientPaymentsPage = page(() => import('@/pages/client/ClientShipments'), 'ClientPaymentsPage')
const ClientReservationsPage = page(() => import('@/pages/client/ClientShipments'), 'ClientReservationsPage')
const ClientShipmentsPage = page(() => import('@/pages/client/ClientShipments'), 'ClientShipmentsPage')
const ShipmentDetailPage = page(() => import('@/pages/client/ClientShipments'), 'ShipmentDetailPage')
const CarrierDashboard = page(() => import('@/pages/transporteur/CarrierDashboard'), 'default')
const CarrierBreakdownPage = page(() => import('@/pages/transporteur/CarrierBreakdownPage'), 'default')
const CarrierOffersPage = page(() => import('@/pages/transporteur/CarrierPages'), 'CarrierOffersPage')
const CarrierPaymentsPage = page(() => import('@/pages/transporteur/CarrierPages'), 'CarrierPaymentsPage')
const CarrierReservationsPage = page(() => import('@/pages/transporteur/CarrierPages'), 'CarrierReservationsPage')
const CarrierTransportsPage = page(() => import('@/pages/transporteur/CarrierPages'), 'CarrierTransportsPage')
const NewOfferPage = page(() => import('@/pages/transporteur/CarrierPages'), 'NewOfferPage')
const OfferDetailPage = page(() => import('@/pages/transporteur/CarrierPages'), 'OfferDetailPage')
const ReceivedRequestDetailPage = page(() => import('@/pages/transporteur/CarrierPages'), 'ReceivedRequestDetailPage')
const ReceivedRequestsPage = page(() => import('@/pages/transporteur/CarrierPages'), 'ReceivedRequestsPage')
const RevenuePage = page(() => import('@/pages/transporteur/CarrierPages'), 'RevenuePage')
const VehiclesPage = page(() => import('@/pages/transporteur/CarrierPages'), 'VehiclesPage') as React.ComponentType<{ adminView?: boolean }>
const AdminDashboard = page(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard')
const UsersPage = page(() => import('@/pages/admin/AdminUsers'), 'UsersPage') as React.ComponentType<{ only?: 'client' | 'transporteur' }>
const AdminRequestsPage = page(() => import('@/pages/admin/AdminMatching'), 'AdminRequestsPage')
const MatchingPage = page(() => import('@/pages/admin/AdminMatching'), 'MatchingPage')
const PoolingsPage = page(() => import('@/pages/admin/AdminMatching'), 'PoolingsPage')
const AdminBreakdownReportsPage = page(() => import('@/pages/admin/AdminBreakdownReports'), 'AdminBreakdownReportsPage')
//const ContactMessagesPage = page(() => import('@/pages/admin/AdminPages'), 'ContactMessagesPage')
const CommissionsPage = page(() => import('@/pages/admin/AdminFinance'), 'CommissionsPage')
const AdminOffersPage = page(() => import('@/pages/admin/AdminPages'), 'AdminOffersPage')
const AdminPaymentsPage = page(() => import('@/pages/admin/AdminPages'), 'AdminPaymentsPage')
const AdminReservationsPage = page(() => import('@/pages/admin/AdminPages'), 'AdminReservationsPage')
const AdminReviewsPage = page(() => import('@/pages/admin/AdminPages'), 'AdminReviewsPage')
const AuditPage = page(() => import('@/pages/admin/AdminPages'), 'AuditPage')
const OperationsPage = page(() => import('@/pages/admin/AdminPages'), 'OperationsPage')
const SettingsPage = page(() => import('@/pages/admin/AdminPages'), 'SettingsPage')
const StatsPage = page(() => import('@/pages/admin/AdminPages'), 'StatsPage')
const TrackingPage = page(() => import('@/pages/admin/AdminPages'), 'TrackingPage')

function Loading() {
  return <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite"><span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-primary" /><span className="sr-only">Chargement…</span></div>
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="comment-ca-marche" element={<HowItWorksPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="a-propos" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="conditions" element={<Navigate to="/conditions-utilisation" replace />} />
        <Route path="mentions-legales" element={<MentionsLegalesPage />} />
        <Route path="conditions-utilisation" element={<CguPage />} />
        <Route path="conditions-commerciales" element={<ConditionsCommercialesPage />} />
        <Route path="politique-de-confidentialite" element={<PolitiqueConfidentialitePage />} />
        <Route path="politique-cookies" element={<PolitiqueCookiesPage />} />
        <Route path="charte" element={<ChartePage />} />
        <Route path="rechercher" element={<SearchPage />} />
        <Route path="transports/:id" element={<TransportDetailPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireRole role="client" />}>
        <Route path="client" element={<ClientLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="demandes" element={<ClientRequestsPage />} />
          <Route path="demandes/nouvelle" element={<NewRequestPage />} />
          <Route path="demandes/:id" element={<RequestDetailPage />} />
          <Route path="rechercher" element={<SearchPage />} />
          <Route path="transports/:id" element={<TransportDetailPage />} />
          <Route path="reservations" element={<ClientReservationsPage />} />
          <Route path="expeditions" element={<ClientShipmentsPage />} />
          <Route path="expeditions/:id" element={<ShipmentDetailPage />} />
          <Route path="paiements" element={<ClientPaymentsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="historique" element={<HistoryPage />} />
          <Route path="evaluations" element={<EvaluationsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="transporteur" />}>
        <Route path="transporteur" element={<TransporteurLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CarrierDashboard />} />
          <Route path="trajets" element={<CarrierOffersPage />} />
          <Route path="trajets/nouveau" element={<NewOfferPage />} />
          <Route path="trajets/:id" element={<OfferDetailPage />} />
          <Route path="demandes" element={<ReceivedRequestsPage />} />
          <Route path="demandes/:id" element={<ReceivedRequestDetailPage />} />
          <Route path="reservations" element={<CarrierReservationsPage />} />
          <Route path="transports" element={<CarrierTransportsPage />} />
          <Route path="pannes" element={<CarrierBreakdownPage />} />
          <Route path="vehicules" element={<VehiclesPage />} />
          <Route path="revenus" element={<RevenuePage />} />
          <Route path="paiements" element={<CarrierPaymentsPage />} />
          <Route path="avis" element={<EvaluationsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="historique" element={<HistoryPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="utilisateurs" element={<UsersPage />} />
          <Route path="clients" element={<UsersPage only="client" />} />
          <Route path="transporteurs" element={<UsersPage only="transporteur" />} />
          <Route path="vehicules" element={<VehiclesPage adminView />} />
          <Route path="demandes" element={<AdminRequestsPage />} />
          <Route path="offres" element={<AdminOffersPage />} />
          <Route path="matching" element={<MatchingPage />} />
          <Route path="mutualisations" element={<PoolingsPage />} />
          <Route path="reservations" element={<AdminReservationsPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="transports" element={<TrackingPage />} />
          <Route path="pannes" element={<AdminBreakdownReportsPage />} />
          <Route path="paiements" element={<AdminPaymentsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="evaluations" element={<AdminReviewsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          {/*<Route path="messages-contact" element={<ContactMessagesPage />} />*/}
          <Route path="statistiques" element={<StatsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="profil" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  )
}
