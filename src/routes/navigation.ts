import {
  BarChart3, Bell, CalendarCheck, ClipboardList, CreditCard, FileText, History, Home, Inbox, Layers, MessageSquare,
  Package, Percent, Route, ScrollText, Search, Settings, ShieldCheck, Star, Truck, User, Users, Wallet, Activity,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon }

export interface SpaceConfig {
  key: 'client' | 'transporteur' | 'admin'
  title: string
  base: string
  cta?: { label: string; to: string }
  nav: NavItem[]
}

/** Menus : ceux de la maquette, complétés par les écrans exigés par le cahier des charges (historique, évaluations, revenus…). */
export const clientSpace: SpaceConfig = {
  key: 'client', title: 'Espace Client', base: '/client',
  cta: { label: 'Publier une demande', to: '/client/demandes/nouvelle' },
  nav: [
    { to: '/client/dashboard', label: 'Tableau de bord', icon: Home },
    { to: '/client/demandes', label: 'Mes demandes', icon: FileText },
    { to: '/client/rechercher', label: 'Rechercher un transport', icon: Search },
    { to: '/client/reservations', label: 'Mes réservations', icon: CalendarCheck },
    { to: '/client/expeditions', label: 'Mes expéditions', icon: Truck },
    { to: '/client/paiements', label: 'Mes paiements', icon: CreditCard },
    { to: '/client/messages', label: 'Messages', icon: MessageSquare },
    { to: '/client/historique', label: 'Historique', icon: History },
    { to: '/client/evaluations', label: 'Évaluations', icon: Star },
    { to: '/client/profil', label: 'Mon profil', icon: User },
  ],
}

export const transporteurSpace: SpaceConfig = {
  key: 'transporteur', title: 'Espace Transporteur', base: '/transporteur',
  cta: { label: 'Publier un trajet', to: '/transporteur/trajets/nouveau' },
  nav: [
    { to: '/transporteur/dashboard', label: 'Tableau de bord', icon: Home },
    { to: '/transporteur/trajets', label: 'Mes trajets', icon: Route },
    { to: '/transporteur/demandes', label: 'Demandes reçues', icon: Inbox },
    { to: '/transporteur/reservations', label: 'Mes réservations', icon: CalendarCheck },
    { to: '/transporteur/transports', label: 'Mes transports', icon: Package },
    { to: '/transporteur/vehicules', label: 'Mes véhicules', icon: Truck },
    { to: '/transporteur/revenus', label: 'Revenus', icon: Wallet },
    { to: '/transporteur/paiements', label: 'Mes paiements', icon: CreditCard },
    { to: '/transporteur/avis', label: 'Avis', icon: Star },
    { to: '/transporteur/messages', label: 'Messages', icon: MessageSquare },
    { to: '/transporteur/historique', label: 'Historique', icon: History },
    { to: '/transporteur/profil', label: 'Mon profil', icon: User },
  ],
}

export const adminSpace: SpaceConfig = {
  key: 'admin', title: 'Administration', base: '/admin',
  nav: [
    { to: '/admin/dashboard', label: 'Tableau de bord', icon: Home },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { to: '/admin/clients', label: 'Clients', icon: User },
    { to: '/admin/transporteurs', label: 'Transporteurs', icon: ShieldCheck },
    { to: '/admin/vehicules', label: 'Véhicules', icon: Truck },
    { to: '/admin/demandes', label: 'Demandes de transport', icon: FileText },
    { to: '/admin/offres', label: 'Offres de transport', icon: Route },
    { to: '/admin/matching', label: 'Matching', icon: Search },
    { to: '/admin/mutualisations', label: 'Mutualisations', icon: Layers },
    { to: '/admin/reservations', label: 'Réservations', icon: CalendarCheck },
    { to: '/admin/operations', label: 'Opérations', icon: ClipboardList },
    { to: '/admin/transports', label: 'Suivi des transports', icon: Activity },
    { to: '/admin/paiements', label: 'Paiements', icon: CreditCard },
    { to: '/admin/commissions', label: 'Commissions', icon: Percent },
    { to: '/admin/evaluations', label: 'Évaluations', icon: Star },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
    { to: '/admin/audit', label: 'Journal d\'activité', icon: ScrollText },
    { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
  ],
}

export const publicNav = [
  { to: '/', label: 'Accueil' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/rechercher', label: 'Rechercher un transport' },
  { to: '/services', label: 'Nos services' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
]

