"""Genera src/lib/modello-visita.json e il seed SQL dal foglio "Visita" (struttura, non dati cliente).

Fonte: Google Sheet "Visita Laura" — fogli "Note 1.0", "Anamnesi iniziale", "Check da duplicare".
Solo domande, sezioni e opzioni dei menu a tendina: nessuna risposta del cliente viene copiata.

Uso: python3 scripts/build_modello_visita.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

SI_NO = ["Si", "No"]
INTEGRATORI = ["Proteine in polvere", "Creatina", "EAA", "Berberina", "Probiotico", "Magnesio", "Ashwagandha",
               "Melatonina", "Zinco", "Omega 3", "Psillo", "Multivitaminico", "Vitamina C", "Enzimi",
               "Bromelina", "Glutammina", "Altro"]
GRUPPI = ["Gambe", "Parte alta", "Polpacci", "Glutei", "Ischio crurali", "Quadricipiti", "Addominali",
          "Dorsali", "Bicipiti", "Tricipiti", "Spalle", "Petto"]
FASI = ["Dimagrimento", "Aumento peso", "Ricomposizione corporea", "Studio TDEE"]
METODOLOGIE = ["Taglio lineare", "ON-OFF", "2 Refeed", "3 Refeed", "Bifasica", "Trifasica", "Risalita lineare"]
PASTI_EXTRA = ["1", "2", "3", "4", ">5"]


def q(id, label, type="text", who="cliente", **kw):
    f = {"id": id, "label": label, "type": type, "who": who}
    f.update(kw)
    return f


def yn(id, label, who="cliente", notes=True):
    return q(id, label, "select", who, options=SI_NO, notes=notes)


def detail(id, of, label="Approfondisci domanda precedente", who="cliente", **kw):
    return q(id, label, "textarea", who, detailOf=of, **kw)


def score(id, label, low, high, who="cliente", **kw):
    return q(id, label, "score", who, min=1, max=5, low=low, high=high, **kw)


def section(id, title, who, fields, **kw):
    s = {"id": id, "title": title, "who": who, "fields": fields}
    s.update(kw)
    return s


# Sezioni comuni (coach): misure, piano alimentare, appunti, area personale con radar.
def misure(extra=()):
    return section("misure", "Misure", "coach", [
        *extra,
        q("peso", "Peso", "number", "coach", unit="kg", step=0.1),
        q("bf", "BF %", "number", "coach", unit="%", step=0.1),
        q("mg", "MG (massa grassa)", "computed", "coach", unit="kg", formula="bf * peso / 100"),
        q("mm", "MM (massa magra)", "computed", "coach", unit="kg", formula="peso - mg"),
    ])


def piano(title):
    return section("piano", title, "coach", [
        q("cho", "CHO", "number", "coach", unit="g"),
        q("prot", "Prot", "number", "coach", unit="g"),
        q("fat", "Fat", "number", "coach", unit="g"),
        q("kcal", "Kcal", "computed", "coach", unit="kcal", formula="cho * 4 + prot * 4 + fat * 9"),
        # Nel foglio "Anamnesi iniziale" la formula puntava a #REF!: qui usa il peso della visita.
        q("kcal_kg", "Kcal/kg", "computed", "coach", unit="kcal/kg", formula="kcal / peso"),
        q("fase", "Fase attuale", "select", "coach", options=FASI),
        q("metodologia", "Metodologia", "select", "coach", options=METODOLOGIE),
    ])


AREA_PERSONALE = section("area_personale", "Area personale (voto da 1 a 5)", "coach", [
    score("adesione", "Adesione al piano 🫡", "Adesione scarsa", "Massima", "coach"),
    score("costanza", "Costanza 📈", "Non costante", "Costante", "coach"),
    score("performance", "Performance 🏋🏻‍♀️", "Scarsa", "Ottima", "coach"),
    score("condizione_voto", "Condizione 🍑", "Nessun risultato", "Miglioramento visibile ad occhio nudo", "coach",
          hint="3 = miglioramento visibile dai dati"),
    score("infortuni", "Problemi/infortuni 🏥", "Infortunio presente", "Nessun infortunio", "coach",
          hint="3 = leggero fastidio"),
    score("stress_voto", "Stress 🧠", "Tanto", "Assente", "coach", hint="Dato da riprendere dalle risposte del cliente"),
    q("note_persona", "Note/appunti personali sulla persona 💬", "textarea", "coach"),
], radar=["adesione", "costanza", "performance", "condizione_voto", "infortuni", "stress_voto"])

OBIETTIVI = section("obiettivi", "Obiettivi e piano d'azione", "coach", [
    q("primi_obiettivi", "🎯 Primi obiettivi", "textarea", "coach"),
    q("note_obiettivi", "📌 Note", "textarea", "coach"),
    q("piano_azione", "🔸 Piano di azione", "textarea", "coach"),
])

# ---------------------------------------------------------------- Visita iniziale (foglio "Anamnesi iniziale")
INIZIALE = [
    section("dati", "Dati personali", "cliente", [
        q("data_nascita", "Data di nascita", "date"),
        q("genere", "Genere", "select", options=["Femminile", "Maschile", "Non identificato"]),
    ]),
    section("anamnesi", "Anamnesi", "cliente", [
        q("conoscenza", "Come sei venut* a conoscenza del mio studio?", "multiselect",
          options=["Social network", "Amici", "Google", "Sito web", "Altro"], notes=True),
        detail("conoscenza_dettaglio", "conoscenza",
               "Approfondisci domanda precedente (nome amici o social di riferimento)"),
        q("obiettivo", "Qual è il tuo obiettivo?", "textarea"),
        yn("alimentazione_sana", "Segui già una alimentazione salutare?"),
        q("recall24", "Quali sono le tue abitudini alimentari giornaliere (Recall 24)", "textarea",
          hint="Colazione, pranzo, cena, spuntini"),
        q("pasti_extra", "Quante volte ti capita di mangiare pasti fuori dalla routine (compreso alcol) in una settimana?",
          "select", options=PASTI_EXTRA, notes=True),
        yn("dopo_cena", "Ti capita di mangiare degli alimenti anche dopo cena?"),
        yn("dolci_dopo_cena", "Ti capita di mangiare alimenti dolci dopo cena?"),
        yn("frutta_verdura", "Mangi frutta e verdura?"),
        detail("frutta_verdura_dettaglio", "frutta_verdura",
               "Approfondisci domanda precedente (es. esclusioni o altro)"),
        q("acqua", "Quanta acqua bevi durante il giorno?", "text"),
    ]),
    section("salute", "Salute", "cliente", [
        yn("allergie", "Sono presenti allergie-intolleranze (certificate)?"),
        detail("allergie_dettaglio", "allergie"),
        yn("gonfiore", "Problemi di gonfiore, reflusso, tosse o acidità?"),
        detail("gonfiore_dettaglio", "gonfiore"),
        yn("esami_sangue", "Hai svolto degli esami del sangue nell'ultimo anno?"),
        yn("esami_alterati", "Erano presenti valori alterati (*)?"),
        q("esami_voci", "Se sì, su quale voce?", "multiselect",
          options=["Colesterolo", "Trigliceridi", "HDL", "LDL", "Glicemia", "Vitamina D"]),
        q("esami_altro", "Specifica altro", "text"),
        yn("chirurgia", "Ti sei sottopost* a chirurgia estetica?"),
        q("chirurgia_cosa", "Se sì, cosa?", "text"),
        yn("patologie", "Sono presenti patologie diagnosticate?"),
        detail("patologie_dettaglio", "patologie", "Approfondimento domanda precedente"),
        yn("amenorrea", "Problematiche a livello di amenorrea?"),
        yn("infortuni_passati", "Hai subito infortuni in passato?"),
        detail("infortuni_dettaglio", "infortuni_passati"),
        yn("sonno_8h", "Riesci a dormire 8 ore a notte?"),
        detail("sonno_8h_dettaglio", "sonno_8h"),
        yn("addormentarsi", "Riesci ad addormentarti subito?"),
        detail("addormentarsi_dettaglio", "addormentarsi"),
        yn("sonno_continuo", "Riesci a mantenere il sonno durante la notte?"),
        detail("sonno_continuo_dettaglio", "sonno_continuo"),
        yn("dolore", "Senti qualche tipologia di dolore nella vita quotidiana o in determinati esercizi?"),
        detail("dolore_dettaglio", "dolore", "Approfondimento domanda precedente"),
        yn("farmaci", "Assumi farmaci?"),
        detail("farmaci_dettaglio", "farmaci", "Approfondimento domanda precedente"),
        yn("terapie_ormonali", "Assumi terapie ormonali?"),
        q("terapie_ormonali_tipo", "Approfondimento domanda precedente", "select", detailOf="terapie_ormonali",
          options=["Pillola generale", "Mini pillola", "Pillola combinata"]),
        yn("integratori", "Assumi integratori?"),
        q("integratori_quali", "Quali integratori?", "multiselect", detailOf="integratori", options=INTEGRATORI),
        q("salute_altro", "Altro", "textarea"),
    ]),
    section("stile_vita", "Stile di vita", "cliente", [
        q("lavoro", "Che lavoro svolgi?", "select",
          options=["Tante ore sedut*", "A volte sedut* a volte in piedi", "Sempre in piedi"], notes=True),
        q("passi", "Quanti passi fai al giorno?", "select", options=["0/5000", "7000/10000", ">10000"], notes=True),
        yn("pesi_passato", "Ti sei già allenat* in passato con i pesi?"),
        q("tipo_allenamento", "Che tipologia di allenamento svolgevi?", "select",
          options=["Monofrequenza", "Multifrequenza", "Basso volume", "Alto volume", "Non sa"]),
        yn("professionisti", "Hai già avuto in passato percorsi con professionisti?"),
        q("professionista", "Se sì, con quale professionista?", "select",
          options=["Personal trainer", "Nutrizionista", "Personal trainer + nutrizione"]),
        q("allenamenti_settimana", "Quanti allenamenti a settimana puoi sostenere?", "select",
          options=["1", "2", "3", "4", "5", "6", "7", "1 + 1 PT", "2 + 1 PT", "3 + 1 PT", "1 + 2 PT", "2 + 2 PT",
                   "3 + 2 PT"]),
        q("note_cliente", "Note aggiuntive", "textarea"),
    ]),
    misure(),
    section("osservazioni", "Osservazioni personali (postura)", "coach", [
        q("piede_appoggio_dx", "Appoggio del piede dx", "select", "coach",
          options=["Piatto tutto", "Appoggio più esterno", "Appoggio più interno", "Conca elevata", "Normale"]),
        q("piede_appoggio_sx", "Appoggio del piede sx", "select", "coach",
          options=["Piatto tutto", "Appoggio più esterno", "Appoggio più interno", "Conca elevata", "Normale"]),
        q("piede_posizione_dx", "Posizione del piede dx", "select", "coach",
          options=["Intraruotato", "Extraruotato", "In asse"]),
        q("piede_posizione_sx", "Posizione del piede sx", "select", "coach",
          options=["Intraruotato", "Extraruotato", "In asse"]),
        q("caviglia_dx", "Caviglia dx", "select", "coach",
          options=["Collassa verso l'interno", "Collassa verso l'esterno", "In asse"]),
        q("caviglia_sx", "Caviglia sx", "select", "coach",
          options=["Collassa verso l'interno", "Collassa verso l'esterno", "In asse"]),
        q("ginocchio_dx", "Ginocchio dx", "select", "coach", options=["Intraruotato", "Extraruotato", "In asse"]),
        q("ginocchio_sx", "Ginocchio sx", "select", "coach", options=["Intraruotato", "Extraruotato", "In asse"]),
        q("bacino", "Bacino", "select", "coach",
          options=["Switch verso sx", "Switch verso dx", "In asse", "Ruota in senso orario",
                   "Ruota in senso antiorario"]),
        q("glutei", "Glutei", "multiselect", "coach",
          options=["Sx più piccolo del dx", "Dx più piccolo del sx", "Gluteo forma a pera", "Gluteo forma a mela",
                   "Cuscinetto gluteo basso", "Cellulite importante", "Infiammazione"]),
        q("trapezio_dx", "Trapezio dx", "select", "coach", options=["Normale", "Ipertono"]),
        q("trapezio_sx", "Trapezio sx", "select", "coach", options=["Normale", "Ipertono"]),
        q("note_osservazioni", "Note aggiuntive", "textarea", "coach"),
    ]),
    piano("Piano iniziale"),
    section("appunti", "Appunti personali", "coach", [
        q("obiettivo_iniziale", "Quale sarà l'obiettivo iniziale?", "select", "coach",
          options=["Dimagrimento", "Aumento peso", "Ricomposizione corporea", "Studio TDEE", "Rinforzo muscolare",
                   "Risolvere un problema"]),
        detail("obiettivo_iniziale_dettaglio", "obiettivo_iniziale", who="coach"),
        yn("integratori_consigliati", "Ho consigliato integratori?", "coach", notes=False),
        q("integratori_consigliati_quali", "Se sì, quali integratori?", "multiselect", "coach", options=INTEGRATORI),
        q("obiettivo_mesociclo", "Quale sarà l'obiettivo del prossimo mesociclo?", "textarea", "coach"),
    ]),
    AREA_PERSONALE,
    OBIETTIVI,
]

# ---------------------------------------------------------------- Check ogni 2 mesi (foglio "Check da duplicare")
CHECK = [
    misure(extra=[q("split", "Split", "text", "coach")]),
    section("salute_attuale", "Salute attuale", "cliente", [
        q("patologie_attuali", "Patologie", "multiselect",
          options=["Intolleranza al glutine", "Intolleranza al lattosio", "Celiachia", "Favismo", "Ipertensione",
                   "PCOS", "GERD", "Gastrite", "Nessuna"]),
        q("terapia", "Terapia farmacologica", "select",
          options=["No", "Pillola contraccettiva", "Pillola combinata", "Mini pillola", "Diuretico", "Nessuna"]),
        q("integrazione", "Integrazione assunta", "multiselect", options=INTEGRATORI),
    ]),
    section("aderenza", "Aderenza", "cliente", [
        q("protocollo", "Come è andato questo protocollo?", "select", options=["Bene", "Insomma", "Male"], notes=True),
        q("protocollo_causa", "Se \"insomma\" o \"male\", la causa è stata", "select",
          options=["Allenamento", "Alimentazione", "Costanza", "Fattori terzi"]),
        detail("protocollo_dettaglio", "protocollo_causa"),
        q("piano_seguito", "Hai seguito il piano di allenamento previsto per queste settimane?", "select",
          options=["Si", "No", "Parzialmente"], notes=True),
        detail("piano_seguito_dettaglio", "piano_seguito"),
        q("consigli_alimentari", "Hai trovato difficile seguire i consigli alimentari?", "select",
          options=["Si", "No", "Con qualche sgarro di troppo"], notes=True),
        q("pasti_extra", "Quanti pasti extra ti sei concess* durante la settimana?", "select", options=PASTI_EXTRA),
        detail("pasti_extra_dettaglio", "pasti_extra"),
        q("aderenza_note", "Note aggiuntive", "textarea"),
    ]),
    section("protocollo_allenamento", "Protocollo allenamento", "cliente", [
        q("allenamento_difficile", "Hai trovato difficile seguire il protocollo di allenamento?", "select",
          options=["Si", "No", "A volte"], notes=True),
        detail("allenamento_difficile_dettaglio", "allenamento_difficile"),
        q("gruppo_meno", "Qual è il gruppo muscolare che ti piace allenare meno?", "select", options=GRUPPI),
        q("gruppo_piu", "Qual è il gruppo muscolare che ti piace allenare di più?", "select", options=GRUPPI),
        q("esercizio_meno", "Qual è l'esercizio della scheda attuale che ti piace meno?", "text"),
        yn("progredisci_meno", "Riesci lo stesso a progredire?"),
        q("esercizio_piu", "Qual è l'esercizio della scheda attuale che ti piace di più?", "text"),
        yn("progredisci_piu", "Riesci a progredire?"),
        yn("fastidio_muscolare", "C'è qualche movimento o esercizio che ti crea fastidio o dolore muscolare?"),
        detail("fastidio_muscolare_dettaglio", "fastidio_muscolare"),
        yn("dolore_articolare", "C'è qualche esercizio dove senti dolore articolare?"),
        detail("dolore_articolare_dettaglio", "dolore_articolare"),
        yn("stanchezza_mentale", "C'è qualche esercizio che ti dà stanchezza mentale?"),
        detail("stanchezza_mentale_dettaglio", "stanchezza_mentale"),
        q("protocollo_note", "Note aggiuntive", "textarea"),
    ]),
    section("dati_benessere", "Dati (voto da 1 a 5)", "cliente", [
        score("condizione", "Condizione", "Pessima", "Ottima"),
        score("durezza", "Durezza muscolare", "Molle", "Duro",
              hint="Se tiri i muscoli e ti tocchi, ti senti duro o molle?"),
        score("wc", "WC", "Non scaricato da qualche giorno", "Ottimo", hint="3 = scaricato ma non al 100%"),
        score("gonfiore", "Sensazione di gonfiore generale o di addome", "Gonfio", "Completamente sgonfio / dry"),
        q("totale_fisico", "Totale condizione fisica", "computed", formula="condizione + durezza + wc + gonfiore",
          unit="/20"),
        score("stress", "Stress", "Tanto", "Assente"),
        score("sonno", "Qualità e quantità del sonno", "Poco", "Tanto"),
        score("fame", "Fame", "Tanta", "Poca"),
        score("energia", "Energia", "A terra", "Tanta"),
        q("totale_benessere", "Totale benessere", "computed", formula="stress + sonno + fame + energia", unit="/20"),
        q("dati_note", "Note aggiuntive", "textarea"),
    ]),
    piano("Macro"),
    section("appunti", "Appunti personali", "coach", [
        yn("obiettivo_raggiunto", "Abbiamo raggiunto l'obiettivo prefissato nel precedente mesociclo?", "coach",
           notes=False),
        detail("obiettivo_raggiunto_dettaglio", "obiettivo_raggiunto", who="coach"),
        yn("integratori_consigliati", "Ho consigliato integratori?", "coach", notes=False),
        q("integratori_consigliati_quali", "Se sì, quali integratori?", "multiselect", "coach", options=INTEGRATORI),
        q("obiettivo_mesociclo", "Quale sarà l'obiettivo del prossimo mesociclo?", "textarea", "coach"),
    ]),
    AREA_PERSONALE,
    OBIETTIVI,
]

MODELLO = {
    "name": "Modello visita",
    "version": 1,
    "intervalDays": 60,
    "kinds": {
        "iniziale": {"title": "Visita iniziale (anamnesi)", "sections": INIZIALE},
        "check": {"title": "Check / monitoraggio", "sections": CHECK},
    },
}


def validate(m):
    for kind, spec in m["kinds"].items():
        ids = set()
        for s in spec["sections"]:
            for f in s["fields"]:
                assert f["id"] not in ids, f"{kind}: id duplicato {f['id']}"
                ids.add(f["id"])
                assert f["who"] == s["who"], f"{kind}.{f['id']}: who diverso dalla sezione"
        for s in spec["sections"]:
            for f in s["fields"]:
                if "detailOf" in f:
                    assert f["detailOf"] in ids, f"{kind}.{f['id']}: detailOf sconosciuto"
            for r in s.get("radar", []):
                assert r in ids, f"{kind}: radar {r} sconosciuto"


if __name__ == "__main__":
    validate(MODELLO)
    out = json.dumps(MODELLO, ensure_ascii=False, indent=2) + "\n"
    (ROOT / "src/lib/modello-visita.json").write_text(out, encoding="utf-8")
    body = json.dumps(MODELLO, ensure_ascii=False)
    assert "$modello$" not in body
    seed = (
        "-- Generato da scripts/build_modello_visita.py: \"Modello visita\" predefinito.\n"
        "insert into public.visit_templates(name, version, body, is_default)\n"
        f"select 'Modello visita', {MODELLO['version']}, $modello${body}$modello$::jsonb, true\n"
        "where not exists (select 1 from public.visit_templates where is_default);\n"
    )
    (ROOT / "supabase/migrations/20260930195916_modello_visita_seed.sql").write_text(seed, encoding="utf-8")
    counts = {k: sum(len(s["fields"]) for s in v["sections"]) for k, v in MODELLO["kinds"].items()}
    print("ok", counts)
