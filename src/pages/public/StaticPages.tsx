import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTitle } from '@/hooks/useTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Notice } from '@/components/shared/ui-bits'
import { useDb, run } from '@/store/store'
import * as L from '@/store/logic'

function Page({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  useTitle(title)
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      {intro && <p className="mt-2 text-base text-muted">{intro}</p>}
      <div className="mt-8 space-y-4">{children}</div>
    </div>
  )
}

export function HowItWorksPage() {
  const steps = [
    ['Inscription', 'Créez votre compte et choisissez votre profil : client ou transporteur.'],
    ['Publication d\'une demande', 'Le client indique le départ, la destination, la date, la marchandise, le poids et ses contacts.'],
    ['Recherche de transport', 'MUTLOG compare la demande aux offres : départ, destination, date, capacité, marchandise et disponibilité.'],
    ['Mutualisation', 'Des demandes compatibles sont regroupées dans un même camion. Pour le lancement, l\'équipe MUTLOG valide chaque regroupement.'],
    ['Validation', 'Le transporteur confirme sa disponibilité ; chaque client reçoit sa participation et une notification.'],
    ['Transport', 'Le statut évolue : confirmée, en cours, livrée, terminée. L\'itinéraire est visible sur la carte.'],
    ['Évaluation', 'Après la livraison, le client note le transporteur, et le transporteur peut noter le client.'],
  ]
  return (
    <Page title="Comment ça marche" intro="De la demande à la livraison, en sept étapes simples.">
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t}><Card className="flex gap-4 p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span><div><h2 className="font-semibold text-ink">{t}</h2><p className="mt-1 text-sm text-muted">{d}</p></div></Card></li>
        ))}
      </ol>
      <Button asChild size="lg"><Link to="/inscription">Commencer</Link></Button>
    </Page>
  )
}

export function ServicesPage() {
  const blocks = [
    ['Pour les clients', ['Publier une demande de transport en quelques champs', 'Comparer les transports disponibles et réserver', 'Partager le véhicule et les frais avec d\'autres clients', 'Suivre l\'expédition, payer, recevoir un reçu, évaluer']],
    ['Pour les transporteurs', ['Enregistrer plusieurs véhicules', 'Publier vos trajets et votre capacité disponible', 'Recevoir des regroupements prêts à confirmer', 'Suivre vos revenus et vos évaluations']],
    ['Notre rôle', ['Vérifier les transporteurs', 'Valider les regroupements', 'Calculer le prix par client et la commission', 'Accompagner les paiements et suivre les opérations']],
  ] as const
  return (
    <Page title="Nos services" intro="MUTLOG relie les marchandises aux capacités de transport disponibles.">
      <div className="grid gap-4 md:grid-cols-3">
        {blocks.map(([t, items]) => (
          <Card key={t} className="p-5"><h2 className="font-semibold text-ink">{t}</h2><ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul></Card>
        ))}
      </div>
    </Page>
  )
}

export function AboutPage() {
  return (
    <Page title="À propos" intro="MUTLOG est une plateforme béninoise de mutualisation des moyens de transport logistique.">
      <Card className="space-y-3 p-6 text-sm text-ink">
        <p>Les petits producteurs, commerçants et PME paient souvent cher pour transporter de petites quantités, pendant que des camions circulent avec des capacités inutilisées. MUTLOG met en relation les deux côtés pour partager les véhicules et les coûts.</p>
        <p>La plateforme est pensée pour le téléphone mobile, avec des formulaires courts et des boutons bien visibles, afin d'être utilisable par tous, y compris en zone rurale.</p>
      </Card>
    </Page>
  )
}

export function ContactPage() {
  const db = useDb()
  const [f, setF] = useState({ name: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim() || !f.message.trim()) return setErr('Renseignez votre nom et votre message.')
    run((d) => { d.users.filter((u) => u.role === 'admin').forEach((a) => L.notify(d, a.id, 'Message de contact', `${f.name} (${f.phone || 'sans téléphone'}) : ${f.message.slice(0, 120)}`, '/admin/notifications')); return { ok: true as const, value: undefined } })
    setSent(true)
  }
  void db
  return (
    <Page title="Contact" intro="Une question ? Écrivez-nous, nous vous répondrons rapidement.">
      <Card className="max-w-xl p-6">
        {sent ? <Notice tone="success">Merci, votre message a bien été envoyé à l'équipe MUTLOG.</Notice> : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {err && <Notice tone="danger">{err}</Notice>}
            <Field label="Nom" htmlFor="n" required><Input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Téléphone" htmlFor="t"><Input id="t" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Message" htmlFor="m" required><textarea id="m" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="w-full rounded-control border border-line bg-surface p-3 text-sm focus-visible:border-primary-2" /></Field>
            <Button type="submit" size="lg">Envoyer</Button>
          </form>
        )}
      </Card>
    </Page>
  )
}

export function TermsPage() {
  const db = useDb()
  const s = db.settings
  return (
    <Page title="Conditions d'utilisation" intro="Résumé des conditions commerciales — à faire valider par le porteur du projet et un conseil juridique avant la mise en production.">
      <Card className="space-y-4 p-6 text-sm text-ink">
        <section><h2 className="font-semibold">Commission MUTLOG</h2><p className="mt-1 text-muted">MUTLOG perçoit une commission de {s.commissionPct} % du montant du transport (taux défini entre 5 % et 10 % selon l'opération). Cette commission {s.commissionBearer === 'transporteur' ? 'est prélevée sur le montant revenant au transporteur ; les clients paient le prix du transport affiché.' : 'est ajoutée à la part de chaque client, au prorata de sa participation ; le transporteur reçoit le prix du transport affiché.'} Le détail est indiqué avant chaque confirmation.</p></section>
        <section><h2 className="font-semibold">Mutualisation</h2><p className="mt-1 text-muted">Le prix du transport est réparti entre les clients d'un même regroupement au prorata de {s.shareBasis === 'poids' ? 'leur poids' : 'leur volume'}. Chaque regroupement est validé par MUTLOG puis confirmé par le transporteur.</p></section>
        <section><h2 className="font-semibold">Paiement</h2><p className="mt-1 text-muted">Les paiements par Mobile Money sont déclarés avec leur référence de transaction et vérifiés par MUTLOG. Un reçu est délivré après confirmation.</p></section>
        <section><h2 className="font-semibold">Données personnelles</h2><p className="mt-1 text-muted">Vos données ne sont pas accessibles publiquement. Les coordonnées d'un client ou d'un transporteur ne sont communiquées à l'autre partie qu'après confirmation d'une opération.</p></section>
      </Card>
    </Page>
  )
}
