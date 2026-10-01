# rikyfalco

Repository di Riccardo Falconi. Contiene l'app gestionale **RF Coaching** e le
skill di Claude Code.

> ## Il repository buono è `Riky1498/rikyfalco`
>
> È quello collegato a Vercel (team `riky4`, progetto `rf-coaching`), quindi è
> l'unico da cui nasce l'app pubblicata. **Lavora solo lì.**
>
> `falconiriccardo5-hub/rikyfalco` è l'originale da cui è nato il fork: resta
> come copia di sicurezza e non va più modificato. Vercel non riesce a vederlo,
> perché può accedere solo ai repository dell'account GitHub `Riky1498`.

## Dove sta cosa

```
rikyfalco/
├── CLAUDE.md              ← questo file: leggilo per primo
├── docs/
│   ├── RECUPERO.md        ← come ritrovare il codice se si perde una chat
│   └── STATO.md           ← a che punto è il lavoro, cosa manca
├── rf-coaching/           ← l'applicazione (Next.js + Supabase)
│   ├── src/app/(app)/     ← pagine dietro login (dashboard, clienti, ...)
│   ├── src/app/visita/    ← portale visite aperto al cliente via token
│   ├── src/components/    ← componenti condivisi
│   ├── src/server/        ← query, azioni, integrazioni, job
│   ├── src/lib/           ← formattazione, auth, whatsapp, modello visita
│   └── supabase/          ← migrazioni SQL
└── .claude/skills/        ← skill di Claude Code
```

## Regole per chi lavora qui (persona o agente)

1. **Tutto il codice sta in git.** Niente modifiche fatte solo sul server o
   caricate a mano su Vercel: quello che non è committato qui è perduto.
2. **Un ramo per lavoro**, PR verso `main`. Non si lavora direttamente su `main`.
3. **Prima di pubblicare** su Vercel: `npm run build` deve passare e il ramo
   deve essere spinto su GitHub.
4. **Non cancellare i deployment vecchi** su Vercel: sono l'ultima rete di
   sicurezza quando una versione non è in git.

## Comandi

```bash
cd rf-coaching
npm ci
npx tsc --noEmit     # controllo dei tipi
npm run build        # build di produzione
npm run dev          # sviluppo in locale
```
