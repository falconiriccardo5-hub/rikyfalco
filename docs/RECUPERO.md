# Come ritrovare il codice se si perde una chat

Scritto dopo la perdita della versione del 26/09/2026, perché non ricapiti.

## Perché era successo

L'app veniva pubblicata su Vercel **caricando i file dal computer** con la CLI,
senza passare da GitHub. Il codice viveva quindi in tre posti fragili: il Mac,
una cartella Drive aggiornata a mano, e dentro i deployment di Vercel. Persa la
chat e la cartella locale, l'unica copia completa del 26/09 è rimasta dentro un
deployment, da cui le API restituiscono i file solo a pezzi.

## La regola che risolve il problema

**Collegare Vercel a GitHub** e non pubblicare più dal computer.

Su Vercel: progetto `rf-coaching` → *Settings* → *Git* → *Connect Git Repository*
→ repository `falconiriccardo5-hub/rikyfalco`, root directory `rf-coaching`.

Da quel momento ogni pubblicazione nasce da un commit: il codice pubblicato è
sempre anche su GitHub, e per tornare indietro basta il ramo o il tag.

## Dove cercare, in ordine

1. **GitHub** — `github.com/Riky1498/rikyfalco`, rami e pull request.
   È la fonte buona. Guarda anche le PR chiuse e i rami `claude/*`.
2. **Deployment Vercel** — ogni deployment conserva i file sorgente caricati.
   Dalla dashboard: progetto → *Deployments* → scegli la data → *Source*.
   Via API, con un token del team:
   ```bash
   curl -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v6/deployments/<ID>/files?teamId=<TEAM>"
   curl -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v7/deployments/<ID>/files/<FILE_UID>?teamId=<TEAM>"
   ```
   Il secondo restituisce il file in base64.
3. **Sessioni di Claude Code** — su claude.ai/code la lista delle sessioni resta
   anche quando la chat non si trova dalla ricerca. Il rapporto di una sessione
   contiene i comandi eseguiti e i file scritti.
4. **Drive** — solo come copia di emergenza, perché va aggiornata a mano.

## Riferimenti utili

| Cosa | Valore |
|---|---|
| Repository buono | `Riky1498/rikyfalco` (collegato a Vercel) |
| Copia di sicurezza | `falconiriccardo5-hub/rikyfalco` (non modificare) |
| Progetto Vercel | `rf-coaching` (team `riky4`) |
| Deployment del 26/09 | `dpl_CnzhLqCSwGbYqbL8wobu1Bf86B1K` |
| Ramo della ricostruzione | `claude/eloquent-bell-37d1x4` (PR #4) |
| Database | Supabase, progetto collegato all'app |

> Il deployment del 26/09 è l'ultima copia completa di quella versione:
> **non cancellarlo** finché la ricostruzione non è completa.

## Se devi dare accesso a un agente

Non incollare mai token o chiavi in chat: restano scritti per sempre nella
conversazione. Mettili come variabili d'ambiente nelle impostazioni
dell'ambiente, e revocali quando il lavoro è finito.
