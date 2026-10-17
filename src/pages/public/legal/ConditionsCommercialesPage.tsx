import { LegalLayout, P, UL, V, Note, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

const { params } = LEGAL

const sections: LegalSectionData[] = [
  {
    id: 'prix',
    title: 'Article 1 – Prix du transport',
    content: (
      <P>
        Le Transporteur fixe son tarif ou son mode de tarification lors de la publication de l’Offre (par exemple un
        prix par tonne). Avant toute Réservation, la plateforme affiche au Client le prix total du transport et le
        montant qui lui est attribué. En cas de mutualisation, les montants des autres clients ne sont pas divulgués.
        Tous les prix sont exprimés en francs CFA (FCFA).
      </P>
    ),
  },
  {
    id: 'repartition',
    title: 'Article 2 – Répartition entre clients en cas de mutualisation',
    content: (
      <>
        {/* DÉCISION D4 : règle exacte de répartition (poids, volume, ou le plus élevé des deux) à fixer. */}
        <P>
          Lorsque plusieurs clients partagent un transport, le prix total est réparti entre eux selon leur volume ou
          leur poids, par application de la règle définie pour l’opération et affichée avant confirmation. La plateforme
          calcule automatiquement la participation de chaque client.
        </P>
      </>
    ),
  },
  {
    id: 'commission',
    title: 'Article 3 – Commission MUTLOG',
    content: (
      <>
        {/* DÉCISION D3 : commission prélevée sur le transporteur (exemple du cahier des charges). Alternative : ajoutée au prix payé par le client. */}
        <P>
          {LEGAL.brand} perçoit une commission comprise entre {params.commissionMin} % et {params.commissionMax} % du
          montant de l’opération, selon l’opération et les conditions du service. Le taux applicable est défini par
          l’Administrateur et affiché avant la confirmation.
        </P>
        <P>La commission est prélevée sur le montant dû au Transporteur. Le Client ne paie aucun supplément.</P>
        <Note>
          Exemple : transport total de 200 000 FCFA, commission de 10 %, soit 20 000 FCFA. Le Transporteur reçoit 180
          000 FCFA nets. La plateforme enregistre automatiquement le montant brut, le taux, la commission et le net du
          Transporteur.
        </Note>
      </>
    ),
  },
  {
    id: 'paiement',
    title: 'Article 4 – Paiement',
    content: (
      <>
        {/* DÉCISION D4 : circuit des fonds en V1. */}
        <P>
          La plateforme est conçue pour intégrer des moyens de paiement locaux, en priorité le Mobile Money et les
          autres solutions de paiement électronique disponibles au Bénin. Tant qu’une passerelle de paiement n’est pas
          activée, le paiement est validé manuellement par l’Administrateur après vérification.
        </P>
        <P>Statuts d’un paiement : en attente, confirmé, échoué, remboursement éventuel.</P>
        <P>
          Le Client règle sa participation selon les modalités affichées. Le montant net est reversé au Transporteur
          après la livraison, une fois l’Opération passée au statut Livré ou Terminé, dans un délai de{' '}
          <V>{params.payoutDelayDays}</V> jours ouvrés.
        </P>
      </>
    ),
  },
  {
    id: 'recus',
    title: 'Article 5 – Reçus et factures',
    content: (
      <P>
        Un reçu est mis à la disposition de chaque Utilisateur dans son historique. La facturation avancée est prévue
        dans une évolution ultérieure.
      </P>
    ),
  },
  {
    id: 'annulation',
    title: 'Article 6 – Annulation et remboursement',
    content: (
      <>
        {/* DÉCISION D5 : barème à valider. */}
        <UL>
          <li>
            Annulation par le Client avant la confirmation du transport : sans frais, remboursement intégral des sommes
            éventuellement versées.
          </li>
          <li>
            Annulation par le Client après confirmation et plus de <V>{params.cancelFreeHours}</V> heures avant le
            départ : remboursement diminué de frais de <V>{params.cancelFeePercent}</V> %.
          </li>
          <li>
            Annulation par le Client moins de <V>{params.cancelLateHours}</V> heures avant le départ ou absence au
            chargement : pas de remboursement, sauf décision de l’Administrateur.
          </li>
          <li>
            Annulation par le Transporteur ou impossibilité d’exécuter le transport : remboursement intégral des clients
            concernés ; {LEGAL.brand} s’efforce de proposer un autre transport. Des annulations répétées peuvent
            entraîner la suspension du Transporteur.
          </li>
          <li>
            Mutualisation non validée par l’Administrateur : aucune Réservation n’est confirmée et toute somme versée
            est remboursée.
          </li>
        </UL>
        <P>
          Les remboursements sont effectués par le moyen de paiement utilisé ou, à défaut, selon les modalités convenues
          avec l’Administrateur.
        </P>
      </>
    ),
  },
  {
    id: 'litiges',
    title: 'Article 7 – Litiges sur une opération',
    content: (
      <P>
        En cas de problème (retard, dommage, marchandise non conforme, non-livraison), l’Utilisateur le signale à{' '}
        {LEGAL.brand} dans les <V>{params.claimDelayHours}</V> heures suivant la livraison prévue ou effective.
        L’Administrateur peut examiner l’opération, entendre les parties et suspendre un reversement le temps de
        l’examen. Cette médiation n’empêche pas les parties de saisir les juridictions compétentes.
      </P>
    ),
  },
]

export default function ConditionsCommercialesPage() {
  return (
    <LegalLayout
      title="Conditions commerciales"
      currentPath="/conditions-commerciales"
      intro={
        <P>
          Ces conditions complètent les conditions d’utilisation. Elles indiquent qui paie quoi : le prix du transport,
          la part de chaque client, la commission {LEGAL.brand} et les règles d’annulation.
        </P>
      }
      sections={sections}
    />
  )
}
