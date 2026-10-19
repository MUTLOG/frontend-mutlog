import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Logo } from '@/components/brand/Logo'
import { Notice } from '@/components/shared/ui-bits'
import { homeFor } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import type { UserType } from '@/domain/types'
import { errorMessage, setApiUser, setToken } from '@/services/api'
import { authApi } from '@/services/mutlogApi'

const selectCls = 'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'

function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  useTitle(title)
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-14">
      <Link to="/" className="mx-auto mb-6" aria-label="MUTLOG — accueil"><Logo /></Link>
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-11" required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-muted" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const nav = useLocation().state as { from?: string; expired?: boolean } | null
  const from = nav?.from

  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const result = await authApi.login(phone, password)
      setToken(result.token)
      setApiUser(result.user)
      navigate(from && from !== '/connexion' ? from : homeFor(result.user.role), { replace: true })
    } catch (cause) {
      setError(errorMessage(cause, 'Connexion impossible.'))
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Connexion" subtitle="Connectez-vous avec votre numéro de téléphone.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {nav?.expired && <Notice tone="warning">Votre session a expiré par sécurité. Reconnectez-vous.</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Numéro de téléphone" htmlFor="phone" hint="Exemple : 01 97 00 00 00">
          <Input id="phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01 97 00 00 00" required />
        </Field>
        <Field label="Mot de passe" htmlFor="password"><PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>Se connecter</Button>
        <div className="flex justify-between text-sm">
          <Link to="/mot-de-passe-oublie" className="font-medium text-primary-2 hover:underline">Mot de passe oublié ?</Link>
          <Link to="/inscription" className="font-medium text-primary-2 hover:underline">Créer un compte</Link>
        </div>
      </form>
    </AuthFrame>
  )
}

const CLIENT_TYPES: [UserType, string][] = [['producteur', 'Producteur agricole'], ['cooperative', 'Coopérative / organisation de producteurs'], ['commercant', 'Commerçant / grossiste'], ['pme', 'PME / entreprise'], ['autre_client', 'Autre']]
const CARRIER_TYPES: [UserType, string][] = [['proprietaire_camion', 'Propriétaire de camion'], ['transporteur_independant', 'Transporteur indépendant'], ['entreprise_transport', 'Entreprise de transport'], ['gestionnaire_flotte', 'Gestionnaire de flotte']]

export function RegisterPage() {
  const [role, setRole] = useState<'client' | 'transporteur'>('client')
  const [f, setF] = useState({ firstName: '', lastName: '', company: '', phone: '', email: '', address: '', city: 'Cotonou', idNumber: '', password: '', userType: 'producteur' as UserType, accept: false })
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ pending: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const types = role === 'client' ? CLIENT_TYPES : CARRIER_TYPES

  const pickRole = (r: 'client' | 'transporteur') => { setRole(r); set('userType', (r === 'client' ? CLIENT_TYPES : CARRIER_TYPES)[0][0]) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.firstName.trim() || !f.lastName.trim() || !f.address.trim()) return setError('Renseignez votre nom, votre prénom et votre adresse.')
    if (!f.accept) return setError('Vous devez accepter les conditions d\'utilisation.')
    setError('')
    if (busy) return
    setBusy(true)
    try {
      const result = await authApi.register({
        role, userType: f.userType, firstName: f.firstName, lastName: f.lastName, company: f.company || null,
        phone: f.phone, email: f.email || null, address: f.address, city: f.city, idNumber: f.idNumber || null,
        password: f.password, acceptTerms: true,
      })
      if (role === 'client') {
        setToken(result.token)
        setApiUser(result.user)
        navigate('/client/dashboard', { replace: true })
      } else {
        // Un compte transporteur doit d'abord être validé par MUTLOG : pas de session ouverte.
        setToken(null)
        setApiUser(null)
        setDone({ pending: true })
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Inscription impossible.'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthFrame title="Compte créé">
        <Notice tone="success">Votre compte transporteur est en attente de validation par l'équipe MUTLOG. Vous pourrez publier vos trajets dès qu'il sera validé.</Notice>
        <Button asChild size="lg" className="mt-5 w-full"><Link to="/connexion">Se connecter</Link></Button>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Créer un compte" subtitle="Choisissez votre profil, puis renseignez quelques informations.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Profil">
          {([['client', 'Client', 'J\'ai des marchandises à transporter'], ['transporteur', 'Transporteur', 'Je propose un camion']] as const).map(([k, t, d]) => (
            <button key={k} type="button" role="radio" aria-checked={role === k} onClick={() => pickRole(k)}
              className={`rounded-control border p-3 text-left transition-colors ${role === k ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-background'}`}>
              <span className="block text-sm font-semibold text-ink">{t}</span><span className="text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" htmlFor="fn" required><Input id="fn" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="given-name" /></Field>
          <Field label="Nom" htmlFor="ln" required><Input id="ln" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="family-name" /></Field>
        </div>
        <Field label="Type d'utilisateur" htmlFor="ut" required>
          <select id="ut" value={f.userType} onChange={(e) => set('userType', e.target.value as UserType)} className={selectCls}>{types.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        {(role === 'transporteur' || ['cooperative', 'pme'].includes(f.userType)) && (
          <Field label={role === 'transporteur' ? 'Nom de l\'entreprise (facultatif)' : 'Nom de la structure'} htmlFor="co"><Input id="co" value={f.company} onChange={(e) => set('company', e.target.value)} /></Field>
        )}
        <Field label="Numéro de téléphone" htmlFor="ph" required hint="Il servira à vous connecter."><Input id="ph" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01 97 00 00 00" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville / localité" htmlFor="ct" required>
            <select id="ct" value={f.city} onChange={(e) => set('city', e.target.value)} className={selectCls}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          </Field>
          <Field label="Adresse" htmlFor="ad" required><Input id="ad" value={f.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" placeholder="Quartier, rue" /></Field>
        </div>
        {role === 'transporteur' && <Field label="Numéro d'identification (IFU), si applicable" htmlFor="ifu"><Input id="ifu" value={f.idNumber} onChange={(e) => set('idNumber', e.target.value)} /></Field>}
        <Field label="Adresse e-mail (facultative)" htmlFor="em"><Input id="em" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Mot de passe" htmlFor="pw" required hint="8 caractères minimum."><PasswordInput id="pw" value={f.password} onChange={(v) => set('password', v)} autoComplete="new-password" /></Field>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" checked={f.accept} onChange={(e) => set('accept', e.target.checked)} className="mt-1 h-4 w-4" />
          <span>J'accepte les <Link to="/conditions" className="font-medium text-primary-2 underline" target="_blank">conditions d'utilisation</Link> et le traitement de mes données personnelles.</span>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>Créer mon compte</Button>
        <p className="text-center text-sm text-muted">Déjà inscrit ? <Link to="/connexion" className="font-medium text-primary-2 hover:underline">Se connecter</Link></p>
      </form>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await authApi.forgot(phone)
      setSent(result.demoCode ?? '')
      setError(''); setStep('code')
    } catch (cause) { setError(errorMessage(cause, 'Demande impossible.')) }
  }
  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await authApi.reset(phone, code, pw)
      setError(''); setStep('done')
    } catch (cause) { setError(errorMessage(cause, 'Réinitialisation impossible.')) }
  }
  return (
    <AuthFrame title="Mot de passe oublié" subtitle="Récupérez l'accès à votre compte avec un code de vérification.">
      {step === 'phone' && (
        <form onSubmit={send} className="space-y-4" noValidate>
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="Numéro de téléphone" htmlFor="p"><Input id="p" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01 97 00 00 00" /></Field>
          <Button type="submit" size="lg" className="w-full">Recevoir un code</Button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={reset} className="space-y-4" noValidate>
          {error && <Notice tone="danger">{error}</Notice>}
          {sent ? <Notice>Mode de développement : code de vérification <strong>{sent}</strong>.</Notice> : <Notice>Si le numéro correspond à un compte, un code de vérification vous sera envoyé. Si aucun SMS n’est configuré, contactez l’administrateur pour le code de test.</Notice>}
          <Field label="Code à 6 chiffres" htmlFor="c"><Input id="c" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Field label="Nouveau mot de passe" htmlFor="npw" hint="8 caractères minimum."><PasswordInput id="npw" value={pw} onChange={setPw} autoComplete="new-password" /></Field>
          <Button type="submit" size="lg" className="w-full">Changer le mot de passe</Button>
        </form>
      )}
      {step === 'done' && (<><Notice tone="success">Mot de passe modifié.</Notice><Button asChild size="lg" className="mt-5 w-full"><Link to="/connexion">Se connecter</Link></Button></>)}
    </AuthFrame>
  )
}
