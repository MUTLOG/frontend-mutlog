import { CalendarCheck, FileText, Truck, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { formatFCFA } from '@/lib/format'
import { OPERATION_STEPS } from '@/types/operation'

const colors = [
  ['Bleu foncé', 'primary', '#0B2A4A', 'bg-primary'],
  ['Bleu 2', 'primary-2', '#123E68', 'bg-primary-2'],
  ['Orange', 'accent', '#FF7A00', 'bg-accent'],
  ['Succès', 'success', '#16A34A', 'bg-success'],
  ['Information', 'info', '#2563EB', 'bg-info'],
  ['Erreur', 'danger', '#DC2626', 'bg-danger'],
  ['Fond', 'background', '#F7F9FC', 'bg-background'],
  ['Texte', 'ink', '#102033', 'bg-ink'],
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Design system MUTLOG</h1>
      <p className="mt-1 text-sm text-muted">Référence : direction UI/UX cible, §9, et maquette fournie.</p>

      <Section title="Couleurs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map(([name, token, hex, cls]) => (
            <Card key={token} className="overflow-hidden">
              <div className={`h-14 border-b border-line ${cls}`} />
              <div className="p-3">
                <p className="text-sm font-semibold text-ink">{name}</p>
                <p className="text-xs text-muted">{hex}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Typographie (Inter)">
        <Card className="space-y-2 p-5">
          <p className="text-5xl font-extrabold text-ink">Le transport plus intelligent</p>
          <p className="text-2xl font-bold text-ink">Tableau de bord</p>
          <p className="text-base font-semibold text-ink">Demandes récentes</p>
          <p className="text-sm text-ink">Abidjan → Bouaké · 5 palettes, produits alimentaires</p>
          <p className="text-xs text-muted">12 oct. 2024</p>
        </Card>
      </Section>

      <Section title="Boutons">
        <Card className="flex flex-wrap items-center gap-3 p-5">
          <Button>Publier une demande</Button>
          <Button variant="primary">Réserver ce transport</Button>
          <Button variant="outline">Se connecter</Button>
          <Button variant="ghost">Voir tout</Button>
          <Button variant="danger">Refuser</Button>
          <Button size="lg">Rechercher</Button>
          <Button disabled>Indisponible</Button>
        </Card>
      </Section>

      <Section title="Badges de statut">
        <Card className="flex flex-wrap items-center gap-3 p-5">
          <Badge tone="pending">En attente</Badge>
          <Badge tone="info">Propositions (3)</Badge>
          <Badge tone="success">Confirmé</Badge>
          <Badge tone="success">Disponible</Badge>
          <Badge tone="success">Vérifié</Badge>
          <Badge tone="danger">Annulé</Badge>
          <span className="mx-2 h-5 w-px bg-line" />
          {[...OPERATION_STEPS.map((s) => s.key), 'arrive_destination', 'annule'].map((k) => (
            <StatusBadge key={k} status={k as never} />
          ))}
        </Card>
      </Section>

      <Section title="Formulaire">
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Ville de départ" htmlFor="depart" required>
            <Input id="depart" placeholder="Sélectionner une ville" />
          </Field>
          <Field label="Poids (kg)" htmlFor="poids" hint="Un poids approximatif suffit.">
            <Input id="poids" inputMode="numeric" placeholder="Poids (kg)" />
          </Field>
          <Field label="Téléphone" htmlFor="tel" required error="Entrez un numéro valide, par exemple 01 97 00 00 00.">
            <Input id="tel" inputMode="tel" defaultValue="0197" aria-invalid="true" />
          </Field>
        </Card>
      </Section>

      <Section title="Indicateurs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText} label="Demandes de transport" value="3" sub="En cours" />
          <StatCard icon={CalendarCheck} label="Réservations" value="2" sub="Confirmées" tone="info" subTone="success" />
          <StatCard icon={Truck} label="Expéditions" value="5" sub="Terminées" tone="success" />
          <StatCard icon={Wallet} label="Économies réalisées" value={formatFCFA(425000)} sub="Ce mois-ci" tone="accent" subTone="muted" />
        </div>
      </Section>

      <Section title="Suivi d'une opération">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Horizontal (md et plus) — étape « En cours »" />
            <div className="p-5"><StatusStepper status="en_cours" /></div>
          </Card>
          <Card>
            <CardHeader title="Annulée" />
            <div className="p-5"><StatusStepper status="annule" /></div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
