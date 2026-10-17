import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTitle } from '@/hooks/useTitle'
import { LEGAL, LEGAL_PAGES, TODO } from '@/features/legal/config'

export interface LegalSectionData {
  id: string
  title: string
  content: ReactNode
}

interface LegalLayoutProps {
  title: string
  intro?: ReactNode
  sections: LegalSectionData[]
  currentPath: string
}

/** Affiche une valeur de config. Un champ non renseigné apparaît « [À compléter] ». */
export function V({ children }: { children: ReactNode }) {
  if (children === TODO) return <strong>[{TODO}]</strong>
  return <>{children}</>
}

export const P = ({ children }: { children: ReactNode }) => <p className="leading-7">{children}</p>

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-2 pl-6 leading-7">{children}</ul>
)

export const Note = ({ children }: { children: ReactNode }) => <p className="italic leading-7">{children}</p>

/** Mise en page volontairement sans couleur ni décor : texte, titres, listes. */
export function LegalLayout({ title, intro, sections, currentPath }: LegalLayoutProps) {
  useTitle(title)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm">
          Version {LEGAL.version} – dernière mise à jour : {LEGAL.lastUpdate}
        </p>
        {intro && <div className="mt-4 space-y-3">{intro}</div>}
      </header>

      <nav aria-label="Sommaire" className="mb-10">
        <h2 className="mb-2 font-semibold">Sommaire</h2>
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-semibold">{s.title}</h2>
            <div className="space-y-3">{s.content}</div>
          </section>
        ))}
      </div>

      <aside className="mt-14">
        <h2 className="mb-2 font-semibold">Autres documents</h2>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          {LEGAL_PAGES.filter((p) => p.path !== currentPath).map((p) => (
            <li key={p.path}>
              <Link to={p.path} className="underline">
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  )
}
