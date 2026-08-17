/**************************************************************************************************
 *  REEL INSTAGRAM — "DIMAGRIMENTO: NON È MAGIA"
 *  Adobe After Effects ExtendScript (.jsx)
 * ------------------------------------------------------------------------------------------------
 *  Genera automaticamente una composizione verticale 1080x1920 @ 30fps, 12 secondi, con:
 *
 *    SCENA 1  (0.0s → 4.0s)   frustrazione iniziale ("ANCORA NON RIESCI A SNELLIRTI?" + 1000 PROVE)
 *    SCENA 2  (4.0s → 6.4s)   rottura del falso mito (bacchetta magica + X rossa + "NON È MAGIA")
 *    SCENA 3  (6.4s → 12.0s)  il sistema (nodo "PERCORSO" + 5 app-icon 3D glossy collegate)
 *
 *  Stile: dark navy, glassmorphism, neon glow, bordi morbidi, highlight glossy, look premium.
 *  Nessun asset esterno: tutto shape layer / text layer / solid.
 *
 *  COME SI USA
 *    File > Scripts > Run Script File...  →  seleziona questo .jsx
 *    (oppure copialo in .../Support Files/Scripts/ e lancialo da File > Scripts)
 *
 *  PERSONALIZZAZIONE
 *    Tutti i testi sono in  CFG.TXT
 *    Tutti i colori sono in CFG.COL  e  CFG.ICONS
 *    Tutti i tempi sono in  CFG.T
 *
 *  Scritto sulla API di After Effects CS6 → 2025 (con fallback protetti da try/catch).
 **************************************************************************************************/

(function reelDimagrimento() {

// =================================================================================================
// 0. CONFIGURAZIONE — modifica qui testi, colori e tempi
// =================================================================================================

var CFG = {

    // ---- Composizione -------------------------------------------------------------------------
    COMP: {
        name:     "REEL_DIMAGRIMENTO_1080x1920",
        width:    1080,
        height:   1920,
        fps:      30,
        duration: 12,
        motionBlur: true
    },

    // ---- Palette generale (esadecimale, convertita in [r,g,b] 0-1) ----------------------------
    COL: {
        bgDeep:      "#04070F",   // navy quasi nero (fondo)
        bgNavy:      "#0A1226",   // navy scuro (base pannelli / icone)
        bgGlowA:     "#1B3A7A",   // glow morbido di sfondo (blu)
        bgGlowB:     "#0E4F63",   // glow morbido di sfondo (teal)
        textMain:    "#F4F1E8",   // bianco caldo / osso
        textSoft:    "#A9B4CC",   // grigio-blu per testi secondari
        accentYellow:"#FFD24A",   // giallo enfasi
        accentBlue:  "#3D8BFF",   // blu elettrico
        accentCyan:  "#5FE9E0",   // cyan
        red:         "#FF3B4E",   // SOLO per "NON È MAGIA" / X
        white:       "#FFFFFF",
        black:       "#000000"
    },

    // ---- Palette per icona (main / secondary / glow) ------------------------------------------
    ICONS: {
        alimentazione: { main:"#8BE04A", second:"#D6F45C", glow:"#A6FF4D" }, // verde lime
        allenamento:   { main:"#2F7BFF", second:"#59D8FF", glow:"#3DA0FF" }, // blu elettrico
        movimento:     { main:"#18C8B4", second:"#79F5E4", glow:"#25E8CE" }, // turchese / teal
        recupero:      { main:"#7B5CF0", second:"#BFA8FF", glow:"#9B7BFF" }, // viola / indigo
        costanza:      { main:"#FF9B2F", second:"#FFD166", glow:"#FFA53D" }  // arancione / ambra
    },

    // ---- Testi --------------------------------------------------------------------------------
    TXT: {
        s1_line1: "ANCORA NON RIESCI",
        s1_line2: "A SNELLIRTI?",
        s1_line3: "NONOSTANTE",
        s1_big:   "1000",
        s1_line4: "PROVE?",
        s1_cards: ["DIETA", "CARDIO", "DETOX", "APP", "SFIDA"],

        s2_line1: "IL DIMAGRIMENTO NON AVVIENE",
        s2_line2: "PER PURA MAGIA",
        s2_stamp: "NON È MAGIA",

        s3_line1: "MA DA CIRCOSTANZE",
        s3_line2: "BEN CALIBRATE",
        s3_center: "PERCORSO",
        s3_final: "IL DIMAGRIMENTO È IL RISULTATO\rDEL SISTEMA,\rNON DELLA FORTUNA",

        icon_labels: {
            alimentazione: "ALIMENTAZIONE",
            allenamento:   "ALLENAMENTO",
            movimento:     "MOVIMENTO",
            recupero:      "RECUPERO",
            costanza:      "COSTANZA"
        }
    },

    // ---- Tempi (secondi) ----------------------------------------------------------------------
    T: {
        s1In: 0.00, s1Out: 4.05,
        s2In: 4.00, s2Out: 6.50,
        s3In: 6.40, s3Out: 12.00,

        // scena 1
        s1_t1: 0.10, s1_t2: 0.30, s1_t3: 0.90, s1_big: 1.05, s1_t4: 1.48,
        s1_cardsStart: 1.90, s1_cardsStep: 0.14,
        s1_exit: 3.70,

        // scena 2
        s2_wand: 4.10, s2_sparks: 4.45, s2_t1: 4.55, s2_t2: 4.78,
        s2_x: 5.35, s2_stamp: 5.52, s2_exit: 6.15,

        // scena 3
        s3_t1: 6.50, s3_t2: 6.68,
        s3_center: 6.92, s3_centerLabel: 7.08,
        s3_connStart: 7.55, s3_connStep: 0.12,
        s3_iconsStart: 8.50, s3_iconsStep: 0.28,
        s3_final: 10.20,
        s3_pulse: 11.10
    },

    // ---- Marker per il sync voce --------------------------------------------------------------
    MARKERS: [
        [0.0,  "Ancora non riesci a snellirti"],
        [1.0,  "nonostante 1000 prove"],
        [4.1,  "il dimagrimento non avviene per pura magia"],
        [6.5,  "ma per circostanze ben calibrate"],
        [8.5,  "icone sistema"],
        [10.2, "frase finale"]
    ],

    // ---- Font: il primo disponibile vince (postScriptName) ------------------------------------
    FONTS: {
        bold: ["Montserrat-ExtraBold", "Poppins-Bold", "Inter-Bold", "Gilroy-ExtraBold",
               "HelveticaNeue-Bold", "Helvetica-Bold", "Arial-BoldMT"],
        med:  ["Montserrat-SemiBold", "Poppins-SemiBold", "Inter-SemiBold",
               "HelveticaNeue-Medium", "Helvetica", "ArialMT"]
    }
};


// =================================================================================================
// 1. UTILITY GENERICHE
// =================================================================================================

/** "#RRGGBB" → [r,g,b] con valori 0..1 (formato colore di After Effects). */
function hex(h) {
    h = h.replace("#", "");
    return [parseInt(h.substr(0, 2), 16) / 255,
            parseInt(h.substr(2, 2), 16) / 255,
            parseInt(h.substr(4, 2), 16) / 255];
}

/** Miscela due colori [r,g,b]. t=0 → a, t=1 → b. */
function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t];
}

/** Schiarisce un colore verso il bianco. */
function lighten(c, t) { return mix(c, [1, 1, 1], t); }

/** Gradi → radianti. */
function rad(d) { return d * Math.PI / 180; }

/**
 * Sceglie il primo font realmente installato tra i candidati.
 * Se l'API app.fonts non è disponibile (versioni vecchie) usa l'ultimo candidato come fallback.
 */
function pickFont(candidates) {
    try {
        if (app.fonts && app.fonts.allFonts) {
            var all = app.fonts.allFonts, i, j;
            // 1) match esatto sul postScriptName
            for (i = 0; i < candidates.length; i++) {
                for (j = 0; j < all.length; j++) {
                    if (all[j].postScriptName === candidates[i]) return all[j].postScriptName;
                }
            }
            // 2) match "morbido": la famiglia contiene il nome richiesto
            for (i = 0; i < candidates.length; i++) {
                var wanted = candidates[i].split("-")[0].toLowerCase();
                for (j = 0; j < all.length; j++) {
                    var fam = (all[j].familyName || "").toLowerCase();
                    if (fam.indexOf(wanted) !== -1) return all[j].postScriptName;
                }
            }
        }
    } catch (e) { /* nessuna API font disponibile: si usa il fallback */ }
    return candidates[candidates.length - 1];
}

/** Imposta il valore di un parametro effetto provando prima il matchName, poi l'indice. */
function fxSet(fx, matchName, index, value) {
    try { fx.property(matchName).setValue(value); return true; } catch (e) {}
    try { fx.property(index).setValue(value); return true; } catch (e2) {}
    return false;
}


// =================================================================================================
// 2. PRIMITIVE SHAPE — i mattoncini con cui è costruito tutto il grafico
// =================================================================================================

/**
 * Crea uno shape layer vuoto con anchor point sull'origine:
 * così le coordinate locali dei gruppi sono "pixel dal centro dell'elemento"
 * e ogni scale-in avviene dal centro visivo.
 */
function createShapeLayer(comp, name, x, y) {
    var l = comp.layers.addShape();
    l.name = name;
    var tr = l.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue([x, y]);
    return l;
}

/** Root "Contents" di uno shape layer. */
function contentsOf(layer) { return layer.property("ADBE Root Vectors Group"); }

/** Aggiunge un fill a un gruppo vettoriale. */
function addFillTo(vec, color, opacity) {
    var f = vec.addProperty("ADBE Vector Graphic - Fill");
    f.property("ADBE Vector Fill Color").setValue(color);
    f.property("ADBE Vector Fill Opacity").setValue(opacity === undefined ? 100 : opacity);
    return f;
}

/** Aggiunge uno stroke a un gruppo vettoriale (cap e join arrotondati = look morbido). */
function addStrokeTo(vec, color, width, opacity) {
    var s = vec.addProperty("ADBE Vector Graphic - Stroke");
    s.property("ADBE Vector Stroke Color").setValue(color);
    s.property("ADBE Vector Stroke Width").setValue(width);
    s.property("ADBE Vector Stroke Opacity").setValue(opacity === undefined ? 100 : opacity);
    try {
        s.property("ADBE Vector Stroke Line Cap").setValue(2);  // Round Cap
        s.property("ADBE Vector Stroke Line Join").setValue(2);  // Round Join
    } catch (e) {}
    return s;
}

/** Applica le trasformazioni di gruppo (posizione / rotazione / scala / opacità). */
function setGroupTransform(g, o) {
    var t = g.property("ADBE Vector Transform Group");
    t.property("ADBE Vector Anchor").setValue([0, 0]);
    if (o.x !== undefined || o.y !== undefined) {
        t.property("ADBE Vector Position").setValue([o.x || 0, o.y || 0]);
    }
    if (o.rotation) t.property("ADBE Vector Rotation").setValue(o.rotation);
    if (o.scale !== undefined) t.property("ADBE Vector Scale").setValue([o.scale, o.scale]);
    if (o.opacity !== undefined) t.property("ADBE Vector Group Opacity").setValue(o.opacity);
    return t;
}

/**
 * Rettangolo arrotondato.
 * o = { name, w, h, r, x, y, rotation, scale, opacity,
 *       fill, fillOpacity, stroke, strokeWidth, strokeOpacity }
 * NB: lo stroke va aggiunto prima del fill, così risulta disegnato sopra di esso.
 * NB2: la posizione è affidata al Transform del gruppo (non al "Rect Position"),
 *      così l'eventuale rotazione avviene attorno al centro della forma.
 */
function addRect(contents, o) {
    var g = contents.addProperty("ADBE Vector Group");
    g.name = o.name || "Rect";
    var vec = g.property("ADBE Vectors Group");

    var rect = vec.addProperty("ADBE Vector Shape - Rect");
    rect.property("ADBE Vector Rect Size").setValue([o.w, o.h]);
    rect.property("ADBE Vector Rect Position").setValue([0, 0]);
    rect.property("ADBE Vector Rect Roundness").setValue(o.r === undefined ? 0 : o.r);

    if (o.stroke) addStrokeTo(vec, o.stroke, o.strokeWidth || 2, o.strokeOpacity);
    if (o.fill)   addFillTo(vec, o.fill, o.fillOpacity);

    setGroupTransform(g, o);
    return g;
}

/** Ellisse / cerchio. Stessa struttura di addRect. */
function addEllipse(contents, o) {
    var g = contents.addProperty("ADBE Vector Group");
    g.name = o.name || "Ellipse";
    var vec = g.property("ADBE Vectors Group");

    var el = vec.addProperty("ADBE Vector Shape - Ellipse");
    el.property("ADBE Vector Ellipse Size").setValue([o.w, o.h]);
    el.property("ADBE Vector Ellipse Position").setValue([0, 0]);

    if (o.stroke) addStrokeTo(vec, o.stroke, o.strokeWidth || 2, o.strokeOpacity);
    if (o.fill)   addFillTo(vec, o.fill, o.fillOpacity);

    setGroupTransform(g, o);
    return g;
}

/**
 * Stella / scintilla (riflessi, sparkles della bacchetta, stelline della luna).
 * o = { name, points, outer, inner, innerRound, outerRound, x, y, rotation, fill, ... }
 */
function addStar(contents, o) {
    var g = contents.addProperty("ADBE Vector Group");
    g.name = o.name || "Star";
    var vec = g.property("ADBE Vectors Group");

    var st = vec.addProperty("ADBE Vector Shape - Star");
    try { st.property("ADBE Vector Star Type").setValue(1); } catch (e) {}          // 1 = Star
    st.property("ADBE Vector Star Points").setValue(o.points || 4);
    st.property("ADBE Vector Star Outer Radius").setValue(o.outer);
    st.property("ADBE Vector Star Inner Radius").setValue(o.inner);
    st.property("ADBE Vector Star Position").setValue([0, 0]);
    try { st.property("ADBE Vector Star Rotation").setValue(o.starRotation || 0); } catch (e) {}
    // NB: nell'SDK i match name contengono il typo "Roundess" — protetti da try/catch.
    try { st.property("ADBE Vector Star Inner Roundess").setValue(o.innerRound || 70); } catch (e) {}
    try { st.property("ADBE Vector Star Outer Roundess").setValue(o.outerRound || 0); } catch (e) {}

    if (o.stroke) addStrokeTo(vec, o.stroke, o.strokeWidth || 2, o.strokeOpacity);
    if (o.fill)   addFillTo(vec, o.fill, o.fillOpacity);

    setGroupTransform(g, o);
    return g;
}

/**
 * Path custom (bezier) definito da un oggetto Shape.
 * Se o.trim === true aggiunge un Trim Paths, esposto come g.__trim,
 * per animare il "disegno" progressivo della linea.
 */
function addPath(contents, o) {
    var g = contents.addProperty("ADBE Vector Group");
    g.name = o.name || "Path";
    var vec = g.property("ADBE Vectors Group");

    var pg = vec.addProperty("ADBE Vector Shape - Group");
    pg.property("ADBE Vector Shape").setValue(o.shape);

    if (o.stroke) addStrokeTo(vec, o.stroke, o.strokeWidth || 2, o.strokeOpacity);
    if (o.fill)   addFillTo(vec, o.fill, o.fillOpacity);

    // Trim Paths in coda al gruppo: agisce sui path che stanno sopra di esso.
    if (o.trim) g.__trim = vec.addProperty("ADBE Vector Filter - Trim");

    setGroupTransform(g, o);
    return g;
}

/** Shape: segmento retto tra due punti. */
function lineShape(x1, y1, x2, y2) {
    var s = new Shape();
    s.vertices    = [[x1, y1], [x2, y2]];
    s.inTangents  = [[0, 0], [0, 0]];
    s.outTangents = [[0, 0], [0, 0]];
    s.closed = false;
    return s;
}

/** Shape: poligono chiuso da una lista di vertici (usato per le punte di freccia). */
function polyShape(verts) {
    var s = new Shape(), i, z = [];
    for (i = 0; i < verts.length; i++) z.push([0, 0]);
    s.vertices = verts; s.inTangents = z.slice(0); s.outTangents = z.slice(0);
    s.closed = true;
    return s;
}

/**
 * Shape: arco di cerchio in bezier esatto (angoli in gradi, y verso il basso).
 * Usato per le frecce circolari dell'icona "COSTANZA".
 */
function arcShape(cx, cy, r, degStart, degEnd) {
    var a0 = rad(degStart), a1 = rad(degEnd), total = a1 - a0;
    var n = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 2)));
    var step = total / n;
    var k = (4 / 3) * Math.tan(step / 4) * r;   // lunghezza tangente per un bezier circolare
    var verts = [], ins = [], outs = [], i, a, tx, ty;

    for (i = 0; i <= n; i++) {
        a  = a0 + step * i;
        tx = -Math.sin(a); ty = Math.cos(a);    // direzione tangente (angolo crescente)
        verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        outs.push([ tx * k,  ty * k]);
        ins.push ([-tx * k, -ty * k]);
    }
    var s = new Shape();
    s.vertices = verts; s.inTangents = ins; s.outTangents = outs; s.closed = false;
    return s;
}

/** Shape (maschera) ellittica, usata per la vignettatura. */
function ellipseMaskShape(cx, cy, rx, ry) {
    var k = 0.5523, s = new Shape();
    s.vertices    = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    s.inTangents  = [[-rx * k, 0], [0, -ry * k], [ rx * k, 0], [0,  ry * k]];
    s.outTangents = [[ rx * k, 0], [0,  ry * k], [-rx * k, 0], [0, -ry * k]];
    s.closed = true;
    return s;
}


// =================================================================================================
// 3. EFFETTI — glow neon e sfocature
// =================================================================================================

/** Glow neon tramite l'effetto Glow di AE. Ritorna l'effetto (o null se non disponibile). */
function addGlowFx(layer, radius, intensity, threshold) {
    try {
        var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Glo2");
        fx.name = "NEON GLOW";
        fxSet(fx, "ADBE Glo2-0002", 2, threshold === undefined ? 40 : threshold);  // Glow Threshold %
        fxSet(fx, "ADBE Glo2-0003", 3, radius    === undefined ? 55 : radius);     // Glow Radius
        fxSet(fx, "ADBE Glo2-0004", 4, intensity === undefined ? 1.1 : intensity); // Glow Intensity
        return fx;
    } catch (e) { return null; }
}

/** Sfocatura gaussiana (aloni morbidi di sfondo). */
function addBlurFx(layer, amount) {
    try {
        var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        fxSet(fx, "ADBE Gaussian Blur 2-0001", 1, amount);
        fxSet(fx, "ADBE Gaussian Blur 2-0003", 3, true);   // Repeat Edge Pixels
        return fx;
    } catch (e) {
        try {                                              // fallback per versioni vecchie
            var fx2 = layer.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur");
            fx2.property(1).setValue(amount);
            return fx2;
        } catch (e2) { return null; }
    }
}

/**
 * Pulsazione leggera del glow, via espressione.
 * Parte dall'inPoint del layer, così resta sincronizzata anche spostando il layer in timeline.
 */
function addGlowPulse(fx, base, amp, speed) {
    if (!fx) return;
    try {
        fx.property("ADBE Glo2-0004").expression =
            "var t = time - thisLayer.inPoint;\r" +
            base + " + " + amp + " * Math.sin(t * " + speed + ");";
    } catch (e) {}
}


// =================================================================================================
// 4. ANIMAZIONE — helper per keyframe ed easing
// =================================================================================================

var TR = "ADBE Transform Group";
function pOpacity(l)  { return l.property(TR).property("ADBE Opacity"); }
function pScale(l)    { return l.property(TR).property("ADBE Scale"); }
function pPosition(l) { return l.property(TR).property("ADBE Position"); }
function pRotation(l) { return l.property(TR).property("ADBE Rotation"); }

/** Numero di dimensioni di una property (1 per opacità, 2 per scala/posizione 2D). */
function dimsOf(prop) {
    try {
        var v = prop.value;
        return (v instanceof Array) ? v.length : 1;
    } catch (e) { return 1; }
}

/** Easing bezier su un singolo keyframe (influenze in percentuale 0..100). */
function ease(prop, idx, inInf, outInf) {
    var d = dimsOf(prop), ein = [], eout = [], i;
    for (i = 0; i < d; i++) {
        ein.push(new KeyframeEase(0, inInf === undefined ? 75 : inInf));
        eout.push(new KeyframeEase(0, outInf === undefined ? 75 : outInf));
    }
    try {
        prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER,
                                            KeyframeInterpolationType.BEZIER);
        prop.setTemporalEaseAtKey(idx, ein, eout);
    } catch (e) {}
}

/** Applica easing smooth a tutti i keyframe di una property. */
function easeAll(prop, inInf, outInf) {
    for (var i = 1; i <= prop.numKeys; i++) ease(prop, i, inInf, outInf);
}

/**
 * ENTRATA STANDARD: fade + scale up, con opzionali overshoot, micro-slide e micro-rotazione.
 * o = { dur, fromScale, toScale, overshoot, offsetX, offsetY, fromRotation }
 */
function animateFadeScale(layer, t, o) {
    o = o || {};
    var dur  = o.dur       !== undefined ? o.dur       : 0.55;
    var from = o.fromScale !== undefined ? o.fromScale : 86;
    var to   = o.toScale   !== undefined ? o.toScale   : 100;
    var over = o.overshoot !== undefined ? o.overshoot : 0;    // % di sovra-scala (pop)

    // --- opacità
    var op = pOpacity(layer);
    op.setValueAtTime(t, 0);
    op.setValueAtTime(t + dur * 0.55, 100);
    easeAll(op, 70, 70);

    // --- scala (con eventuale overshoot per un pop più deciso)
    var sc = pScale(layer);
    sc.setValueAtTime(t, [from, from]);
    if (over !== 0) {
        sc.setValueAtTime(t + dur * 0.62, [to + over, to + over]);
        sc.setValueAtTime(t + dur * 1.05, [to, to]);
    } else {
        sc.setValueAtTime(t + dur, [to, to]);
    }
    easeAll(sc, 85, 55);

    // --- micro slide verticale / orizzontale
    if (o.offsetY || o.offsetX) {
        var pp = pPosition(layer), base = pp.value;
        pp.setValueAtTime(t, [base[0] + (o.offsetX || 0), base[1] + (o.offsetY || 0)]);
        pp.setValueAtTime(t + dur, base);
        easeAll(pp, 85, 40);
    }

    // --- micro rotazione con rimbalzo (usata dalle card della scena 1)
    if (o.fromRotation) {
        var rr = pRotation(layer);
        rr.setValueAtTime(t, o.fromRotation);
        rr.setValueAtTime(t + dur * 0.80, o.fromRotation * -0.18);
        rr.setValueAtTime(t + dur * 1.15, 0);
        easeAll(rr, 80, 60);
    }
    return layer;
}

/** USCITA STANDARD: fade out con leggero scale (to < 100 si ritira, > 100 si allarga). */
function animateOut(layer, t, o) {
    o = o || {};
    var dur = o.dur !== undefined ? o.dur : 0.32;
    var to  = o.to  !== undefined ? o.to  : 104;

    var op = pOpacity(layer);
    op.setValueAtTime(t, 100);
    op.setValueAtTime(t + dur, 0);
    ease(op, op.numKeys - 1, 70, 70);
    ease(op, op.numKeys, 70, 70);

    var sc = pScale(layer);
    var cur = sc.numKeys > 0 ? sc.valueAtTime(t, false) : sc.value;
    sc.setValueAtTime(t, cur);
    sc.setValueAtTime(t + dur, [to, to]);
    ease(sc, sc.numKeys - 1, 70, 70);
    ease(sc, sc.numKeys, 70, 70);
    return layer;
}

/** Pulse: piccolo "respiro" di scala (usato sul nodo centrale a fine reel). */
function animatePulse(layer, t, amount, dur) {
    var sc = pScale(layer);
    var base = sc.numKeys > 0 ? sc.valueAtTime(t, false) : sc.value;
    sc.setValueAtTime(t, base);
    sc.setValueAtTime(t + dur * 0.45, [base[0] + amount, base[1] + amount]);
    sc.setValueAtTime(t + dur, base);
    // easing solo sui 3 keyframe appena creati, per non alterare l'entrata
    for (var i = sc.numKeys - 2; i <= sc.numKeys; i++) if (i > 0) ease(sc, i, 70, 70);
    return layer;
}

/** Ritaglia il layer in timeline (comp più pulita e leggera in preview). */
function trim(layer, tIn, tOut) {
    if (tIn  !== null && tIn  !== undefined) layer.inPoint  = Math.max(0, tIn);
    if (tOut !== null && tOut !== undefined) layer.outPoint = tOut;
    return layer;
}


// =================================================================================================
// 5. FACTORY DI ALTO LIVELLO — testi, badge di vetro, icone glossy, connettori
// =================================================================================================

var FONT_BOLD, FONT_MED;   // risolti in main()

/**
 * TEXT LAYER pronto all'uso, con anchor point ricentrato sul bounding box reale:
 * indispensabile perché scale/pop avvengano dal centro visivo del testo.
 *
 * o = { name, text, x, y, size, color, font, tracking, leadingRatio, glow }
 */
function createTextLayer(comp, o) {
    var l = comp.layers.addText(o.text);
    l.name = o.name;

    var srcProp = l.property("ADBE Text Properties").property("ADBE Text Document");
    var td = srcProp.value;
    td.font          = o.font || FONT_BOLD;
    td.fontSize      = o.size;
    td.applyFill     = true;
    td.fillColor     = o.color;
    td.applyStroke   = false;
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    try { td.tracking = (o.tracking === undefined ? 20 : o.tracking); } catch (e) {}
    try {
        td.autoLeading = false;
        td.leading = o.size * (o.leadingRatio === undefined ? 1.06 : o.leadingRatio);
    } catch (e) {}
    srcProp.setValue(td);

    // Ricentra l'anchor point sul rettangolo del testo (da fare PRIMA di qualsiasi trim).
    var r = l.sourceRectAtTime(0, false);
    l.property(TR).property("ADBE Anchor Point")
                  .setValue([r.left + r.width / 2, r.top + r.height / 2]);
    l.property(TR).property("ADBE Position").setValue([o.x, o.y]);

    if (o.glow) addGlowFx(l, o.glow.radius || 45, o.glow.intensity || 0.7, o.glow.threshold || 55);
    if (CFG.COMP.motionBlur) l.motionBlur = true;
    return l;
}

/**
 * GLASS BADGE — card "vetro" con bordo luminoso, riflesso in alto e testo interno.
 * Usata per le label DIETA / CARDIO / DETOX / APP / SFIDA della scena 1.
 *
 * o = { name, text, x, y, w, h, tint, glow, fontSize }
 * Ritorna { bg, label, ctrl }.
 */
function createGlassBadge(comp, o) {
    var r     = o.h / 2;
    var tint  = o.tint || hex(CFG.COL.accentBlue);
    var glowC = o.glow || tint;
    var navy  = hex(CFG.COL.bgNavy);

    var bg = createShapeLayer(comp, o.name, o.x, o.y);
    var c  = contentsOf(bg);

    // L'ordine di creazione va dal davanti verso il fondo (il primo gruppo è il più in alto).
    addRect(c, { name: "GLOSS",  w: o.w - 26, h: o.h * 0.34, r: o.h * 0.17, y: -o.h * 0.26,
                 fill: hex(CFG.COL.white), fillOpacity: 16 });
    addRect(c, { name: "RIM",    w: o.w, h: o.h, r: r,
                 stroke: glowC, strokeWidth: 2, strokeOpacity: 80 });
    addRect(c, { name: "TINT",   w: o.w - 4, h: o.h - 4, r: r - 2, fill: tint, fillOpacity: 16 });
    addRect(c, { name: "GLASS",  w: o.w - 4, h: o.h - 4, r: r - 2,
                 fill: lighten(navy, 0.10), fillOpacity: 82 });
    addRect(c, { name: "HALO",   w: o.w + 16, h: o.h + 16, r: r + 8, fill: glowC, fillOpacity: 12 });
    addRect(c, { name: "SHADOW", w: o.w, h: o.h, r: r, y: 8,
                 fill: hex(CFG.COL.black), fillOpacity: 45 });

    addGlowFx(bg, 28, 0.55, 62);
    if (CFG.COMP.motionBlur) bg.motionBlur = true;

    var label = createTextLayer(comp, {
        name: o.name + "_LABEL", text: o.text, x: o.x, y: o.y,
        size: o.fontSize || 30, color: lighten(tint, 0.55), tracking: 90
    });

    return { bg: bg, label: label, ctrl: bg };
}

/**
 * GLOSSY ICON — la mini "app icon 3D" premium.
 *
 * Struttura, dal davanti al fondo:
 *   SYMBOL · GLOSS_HI · GLOSS_TOP · INNER_RIM · RIM · BODY_TINT · BODY · HALO · SHADOW
 *
 * o = { name, label, labelSize, x, y, size, main, second, glow, symbolFn, circular }
 * Ritorna { icon, label, glowFx, bodyColor }.
 */
function createGlossyIcon(comp, o) {
    var S     = o.size;
    var rr    = o.circular ? S / 2 : S * 0.30;          // raggio degli angoli (bordi morbidi)
    var navy  = hex(CFG.COL.bgNavy);
    var main  = o.main;
    var second= o.second || lighten(main, 0.35);
    var glowC = o.glow   || main;

    // Corpo scuro tinto del colore tema: dà profondità mantenendo il look "vetro scuro".
    var body     = mix(navy, main, 0.22);
    var bodyTint = main;
    // Colore risultante del corpo: serve al ritaglio della luna nell'icona RECUPERO.
    var bodyMix  = mix(body, bodyTint, 0.30);

    var icon  = createShapeLayer(comp, o.name, o.x, o.y);
    var c     = contentsOf(icon);
    var shape = o.circular ? addEllipse : addRect;      // badge circolare oppure rounded square

    // --- 1. SIMBOLO (primo piano) --------------------------------------------------------------
    if (o.symbolFn) {
        o.symbolFn(c, { size: S, main: main, second: second, glow: glowC,
                        body: bodyMix, white: hex(CFG.COL.white) });
    }

    // --- 2. RIFLESSO GLOSSY superiore: alone largo + colpo di luce -----------------------------
    shape(c, { name: "GLOSS_HI",  w: S * 0.50, h: S * 0.10, r: S * 0.05, y: -S * 0.36,
               fill: hex(CFG.COL.white), fillOpacity: 26 });
    shape(c, { name: "GLOSS_TOP", w: S * 0.82, h: S * 0.36, r: rr * 0.75, y: -S * 0.22,
               fill: hex(CFG.COL.white), fillOpacity: 13 });

    // --- 3. BORDI: rim interno chiaro + rim esterno neon ---------------------------------------
    shape(c, { name: "INNER_RIM", w: S * 0.88, h: S * 0.88, r: rr * 0.86,
               stroke: hex(CFG.COL.white), strokeWidth: 1.5, strokeOpacity: 20 });
    shape(c, { name: "RIM",       w: S - 2, h: S - 2, r: rr,
               stroke: glowC, strokeWidth: 3.5, strokeOpacity: 90 });

    // --- 4. CORPO: tinta tema sopra base navy = materiale vetroso ------------------------------
    shape(c, { name: "BODY_TINT", w: S * 0.94, h: S * 0.94, r: rr * 0.94,
               fill: bodyTint, fillOpacity: 30 });
    shape(c, { name: "BODY",      w: S, h: S, r: rr, fill: body, fillOpacity: 100 });

    // --- 5. ALONE neon + ombra di profondità (sul fondo) ---------------------------------------
    shape(c, { name: "HALO",      w: S * 1.17, h: S * 1.17, r: rr * 1.2,
               fill: glowC, fillOpacity: 14 });
    shape(c, { name: "SHADOW",    w: S + 4, h: S + 4, r: rr, y: S * 0.09,
               fill: hex(CFG.COL.black), fillOpacity: 55 });

    var glowFx = addGlowFx(icon, 48, 1.0, 48);
    if (CFG.COMP.motionBlur) icon.motionBlur = true;

    // --- 6. LABEL testuale sotto l'icona -------------------------------------------------------
    var label = null;
    if (o.label) {
        label = createTextLayer(comp, {
            name: o.name + "_LABEL", text: o.label,
            x: o.x, y: o.y + S * 0.5 + 52,
            size: o.labelSize || 32, color: lighten(main, 0.62), tracking: 110
        });
    }

    return { icon: icon, label: label, glowFx: glowFx, bodyColor: bodyMix };
}

/**
 * CONNECTOR LINE — linea luminosa dal nodo centrale verso un'icona.
 * Viene aggiunta come coppia di gruppi (linea + scia soft) dentro l'unico layer "CONNECTORS".
 * Ritorna l'array dei Trim Paths da animare.
 */
function createConnectorLine(connLayer, o) {
    var dx = o.x2 - o.x1, dy = o.y2 - o.y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len;

    // Accorcia agli estremi: la linea non deve toccare né il nodo centrale né l'icona.
    var sx = o.x1 + ux * o.startGap, sy = o.y1 + uy * o.startGap;
    var ex = o.x2 - ux * o.endGap,   ey = o.y2 - uy * o.endGap;

    var c = contentsOf(connLayer);

    var g = addPath(c, { name: o.name, shape: lineShape(sx, sy, ex, ey),
                         stroke: o.color, strokeWidth: 3, strokeOpacity: 85, trim: true });
    var gSoft = addPath(c, { name: o.name + "_SOFT", shape: lineShape(sx, sy, ex, ey),
                             stroke: o.color, strokeWidth: 10, strokeOpacity: 18, trim: true });

    return [g.__trim, gSoft.__trim];
}

/** Anima i Trim Paths: la linea si disegna dal centro verso l'icona. */
function animateConnector(trims, t, dur) {
    for (var i = 0; i < trims.length; i++) {
        var end = trims[i].property("ADBE Vector Trim End");
        end.setValueAtTime(t, 0);
        end.setValueAtTime(t + dur, 100);
        easeAll(end, 80, 40);
    }
}


// =================================================================================================
// 6. SIMBOLI DELLE ICONE — solo primitive (rect, ellipse, path, star)
//    Ogni funzione disegna il simbolo centrato in (0,0) all'interno del layer icona.
//    Firma: (contents, ctx) con ctx = { size, main, second, glow, body, white }
//    Il fattore k normalizza il disegno rispetto alla dimensione base di 170px.
// =================================================================================================

/** 1. ALIMENTAZIONE — forchetta + coltello stilizzati. */
function createFoodIcon(contents, ctx) {
    var k = ctx.size / 170;
    var col = lighten(ctx.second, 0.42);

    // ---- COLTELLO (a destra): lama + manico
    addRect(contents, { name: "SYM_KNIFE_BLADE",  w: 13 * k, h: 40 * k, r: 6 * k,
                        x: 22 * k, y: -14 * k, fill: col, fillOpacity: 96 });
    addRect(contents, { name: "SYM_KNIFE_HANDLE", w: 8 * k,  h: 26 * k, r: 4 * k,
                        x: 22 * k, y:  18 * k, fill: col, fillOpacity: 88 });

    // ---- FORCHETTA (a sinistra): 3 denti + collo + gambo
    addRect(contents, { name: "SYM_FORK_T1",   w: 6 * k,  h: 20 * k, r: 3 * k,
                        x: -30 * k, y: -28 * k, fill: col, fillOpacity: 96 });
    addRect(contents, { name: "SYM_FORK_T2",   w: 6 * k,  h: 20 * k, r: 3 * k,
                        x: -21 * k, y: -28 * k, fill: col, fillOpacity: 96 });
    addRect(contents, { name: "SYM_FORK_T3",   w: 6 * k,  h: 20 * k, r: 3 * k,
                        x: -12 * k, y: -28 * k, fill: col, fillOpacity: 96 });
    addRect(contents, { name: "SYM_FORK_NECK", w: 24 * k, h: 10 * k, r: 5 * k,
                        x: -21 * k, y: -14 * k, fill: col, fillOpacity: 96 });
    addRect(contents, { name: "SYM_FORK_STEM", w: 8 * k,  h: 32 * k, r: 4 * k,
                        x: -21 * k, y:  18 * k, fill: col, fillOpacity: 88 });
}

/** 2. ALLENAMENTO — manubrio. */
function createDumbbellIcon(contents, ctx) {
    var k = ctx.size / 170;
    var col = lighten(ctx.second, 0.40);

    addRect(contents, { name: "SYM_DB_BAR",   w: 46 * k, h: 11 * k, r: 5 * k,
                        fill: col, fillOpacity: 95 });
    addRect(contents, { name: "SYM_DB_PL_L",  w: 15 * k, h: 40 * k, r: 6 * k,
                        x: -28 * k, fill: col, fillOpacity: 98 });
    addRect(contents, { name: "SYM_DB_PL_R",  w: 15 * k, h: 40 * k, r: 6 * k,
                        x:  28 * k, fill: col, fillOpacity: 98 });
    addRect(contents, { name: "SYM_DB_CAP_L", w: 8 * k,  h: 24 * k, r: 4 * k,
                        x: -39 * k, fill: col, fillOpacity: 85 });
    addRect(contents, { name: "SYM_DB_CAP_R", w: 8 * k,  h: 24 * k, r: 4 * k,
                        x:  39 * k, fill: col, fillOpacity: 85 });
}

/** 3. MOVIMENTO — due impronte in avanzamento + scia di movimento. */
function createMovementIcon(contents, ctx) {
    var k = ctx.size / 170;
    var col = lighten(ctx.second, 0.40);

    // impronta anteriore (in alto a destra)
    addEllipse(contents, { name: "SYM_STEP_A_TOE",  w: 9 * k,  h: 8 * k,
                           x: 22 * k, y: -30 * k, fill: col, fillOpacity: 90 });
    addRect(contents,    { name: "SYM_STEP_A_SOLE", w: 19 * k, h: 30 * k, r: 9.5 * k,
                           x: 16 * k, y: -14 * k, rotation: 12, fill: col, fillOpacity: 95 });

    // impronta posteriore (in basso a sinistra)
    addEllipse(contents, { name: "SYM_STEP_B_TOE",  w: 9 * k,  h: 8 * k,
                           x: -12 * k, y: -2 * k, fill: col, fillOpacity: 78 });
    addRect(contents,    { name: "SYM_STEP_B_SOLE", w: 19 * k, h: 30 * k, r: 9.5 * k,
                           x: -18 * k, y: 15 * k, rotation: -12, fill: col, fillOpacity: 86 });

    // scia: tre trattini che suggeriscono la direzione
    addRect(contents, { name: "SYM_STEP_TRAIL_1", w: 16 * k, h: 4 * k, r: 2 * k,
                        x: -34 * k, y: -30 * k, fill: col, fillOpacity: 55 });
    addRect(contents, { name: "SYM_STEP_TRAIL_2", w: 11 * k, h: 4 * k, r: 2 * k,
                        x: -37 * k, y: -20 * k, fill: col, fillOpacity: 38 });
    addRect(contents, { name: "SYM_STEP_TRAIL_3", w: 7 * k,  h: 4 * k, r: 2 * k,
                        x: -39 * k, y: -10 * k, fill: col, fillOpacity: 24 });
}

/**
 * 4. RECUPERO — luna crescente + due stelline.
 * La falce si ottiene sovrapponendo al disco chiaro un cerchio del colore del corpo icona:
 * tecnica deterministica, nessuna operazione booleana richiesta.
 */
function createSleepIcon(contents, ctx) {
    var k = ctx.size / 170;
    var col = lighten(ctx.second, 0.45);

    // stelline (davanti a tutto)
    addStar(contents, { name: "SYM_MOON_SPARK_1", points: 4, outer: 9 * k, inner: 2.6 * k,
                        x: 30 * k, y: -30 * k, fill: col, fillOpacity: 90, innerRound: 80 });
    addStar(contents, { name: "SYM_MOON_SPARK_2", points: 4, outer: 6 * k, inner: 1.8 * k,
                        x: 36 * k, y:  -8 * k, fill: col, fillOpacity: 65, innerRound: 80 });

    // cerchio di ritaglio (stesso colore del corpo) → genera la falce
    addEllipse(contents, { name: "SYM_MOON_CARVE", w: 52 * k, h: 52 * k,
                           x: 14 * k, y: -10 * k, fill: ctx.body, fillOpacity: 100 });
    // disco luna
    addEllipse(contents, { name: "SYM_MOON_DISC",  w: 58 * k, h: 58 * k,
                           x: -2 * k, y: 2 * k, fill: col, fillOpacity: 96 });
}

/** 5. COSTANZA — due frecce circolari (loop / repeat). */
function createRepeatIcon(contents, ctx) {
    var k = ctx.size / 170;
    var col = lighten(ctx.second, 0.40);
    var R = 30 * k;

    // Punta di freccia: triangolo che guarda verso +x, poi ruotato lungo la tangente dell'arco.
    var tri = polyShape([[10 * k, 0], [-7 * k, -8 * k], [-7 * k, 8 * k]]);

    // --- freccia superiore: arco 185° → 340° (con y verso il basso l'arco passa sopra il centro)
    var a1 = 340;
    addPath(contents, { name: "SYM_LOOP_HEAD_1", shape: tri, fill: col, fillOpacity: 96,
                        x: R * Math.cos(rad(a1)), y: R * Math.sin(rad(a1)), rotation: a1 + 90 });
    addPath(contents, { name: "SYM_LOOP_ARC_1", shape: arcShape(0, 0, R, 185, a1),
                        stroke: col, strokeWidth: 9 * k, strokeOpacity: 95 });

    // --- freccia inferiore: arco 5° → 160°
    var a2 = 160;
    addPath(contents, { name: "SYM_LOOP_HEAD_2", shape: tri, fill: col, fillOpacity: 96,
                        x: R * Math.cos(rad(a2)), y: R * Math.sin(rad(a2)), rotation: a2 + 90 });
    addPath(contents, { name: "SYM_LOOP_ARC_2", shape: arcShape(0, 0, R, 5, a2),
                        stroke: col, strokeWidth: 9 * k, strokeOpacity: 95 });
}


// =================================================================================================
// 7. SFONDO
// =================================================================================================

/**
 * Fondale: solid navy quasi nero + due aloni sfocati (blu e teal),
 * griglia tech appena percettibile e vignettatura morbida.
 */
function buildBackground(comp) {
    var W = CFG.COMP.width, H = CFG.COMP.height, D = CFG.COMP.duration;

    // --- fondo pieno
    var bg = comp.layers.addSolid(hex(CFG.COL.bgDeep), "BG", W, H, 1, D);

    // --- alone blu in alto (blend Add per un glow luminoso)
    var glowA = createShapeLayer(comp, "BG_GLOW_01", W * 0.50, H * 0.30);
    addEllipse(contentsOf(glowA), { name: "SOFT", w: 1150, h: 1150,
                                    fill: hex(CFG.COL.bgGlowA), fillOpacity: 100 });
    addBlurFx(glowA, 320);
    pOpacity(glowA).setValue(48);
    glowA.blendingMode = BlendingMode.ADD;

    // --- alone teal in basso a sinistra
    var glowB = createShapeLayer(comp, "BG_GLOW_02", W * 0.28, H * 0.78);
    addEllipse(contentsOf(glowB), { name: "SOFT", w: 900, h: 900,
                                    fill: hex(CFG.COL.bgGlowB), fillOpacity: 100 });
    addBlurFx(glowB, 300);
    pOpacity(glowB).setValue(38);
    glowB.blendingMode = BlendingMode.ADD;

    // --- griglia tech: linee molto tenui, danno "materia" al fondo
    var grid = createShapeLayer(comp, "BG_GRID", 0, 0);
    var gc = contentsOf(grid), i;
    for (i = 0; i <= W; i += 90) {
        addPath(gc, { name: "V_" + i, shape: lineShape(i, 0, i, H),
                      stroke: hex(CFG.COL.accentBlue), strokeWidth: 1 });
    }
    for (i = 0; i <= H; i += 90) {
        addPath(gc, { name: "H_" + i, shape: lineShape(0, i, W, i),
                      stroke: hex(CFG.COL.accentBlue), strokeWidth: 1 });
    }
    pOpacity(grid).setValue(6);

    // --- vignettatura: solid nero con maschera ellittica sottratta e molto sfumata
    var vig = comp.layers.addSolid(hex(CFG.COL.black), "VIGNETTE", W, H, 1, D);
    try {
        var m = vig.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        m.property("ADBE Mask Shape").setValue(ellipseMaskShape(W / 2, H / 2, W * 0.62, H * 0.56));
        m.maskMode = MaskMode.SUBTRACT;
        m.property("ADBE Mask Feather").setValue([420, 420]);
    } catch (e) {}
    pOpacity(vig).setValue(72);

    // I layer di sfondo sono "shy" per tenere la timeline leggibile.
    var bgLayers = [bg, glowA, glowB, grid, vig], j;
    for (j = 0; j < bgLayers.length; j++) {
        trim(bgLayers[j], 0, D);
        bgLayers[j].shy = true;
    }
    return bg;
}


// =================================================================================================
// 8. SCENA 1 — "ANCORA NON RIESCI A SNELLIRTI? NONOSTANTE 1000 PROVE"
// =================================================================================================

function buildScene01(comp) {
    var T = CFG.T, X = CFG.COMP.width / 2, layers = [], i;

    // --- Titoli principali ---------------------------------------------------------------------
    var t1 = createTextLayer(comp, { name: "TITLE_01", text: CFG.TXT.s1_line1,
        x: X, y: 470, size: 92, color: hex(CFG.COL.textMain), tracking: 10 });
    var t2 = createTextLayer(comp, { name: "TITLE_02", text: CFG.TXT.s1_line2,
        x: X, y: 585, size: 92, color: hex(CFG.COL.textMain), tracking: 10 });

    // --- Kicker "NONOSTANTE" -------------------------------------------------------------------
    var t3 = createTextLayer(comp, { name: "TITLE_03_KICKER", text: CFG.TXT.s1_line3,
        x: X, y: 790, size: 56, color: hex(CFG.COL.accentCyan), tracking: 220,
        glow: { radius: 34, intensity: 0.6, threshold: 55 } });

    // --- "1000" dominante ----------------------------------------------------------------------
    var big = createTextLayer(comp, { name: "TITLE_04_BIG_1000", text: CFG.TXT.s1_big,
        x: X, y: 1000, size: 300, color: hex(CFG.COL.accentYellow), tracking: -10,
        glow: { radius: 70, intensity: 1.15, threshold: 42 } });

    // --- "PROVE?" ------------------------------------------------------------------------------
    var t4 = createTextLayer(comp, { name: "TITLE_05", text: CFG.TXT.s1_line4,
        x: X, y: 1180, size: 96, color: hex(CFG.COL.textMain), tracking: 40 });

    // --- Entrate: fade + scale morbidi, pop deciso su "1000" -----------------------------------
    animateFadeScale(t1,  T.s1_t1,  { dur: 0.62, fromScale: 88, offsetY: 34 });
    animateFadeScale(t2,  T.s1_t2,  { dur: 0.62, fromScale: 88, offsetY: 34 });
    animateFadeScale(t3,  T.s1_t3,  { dur: 0.50, fromScale: 92 });
    animateFadeScale(big, T.s1_big, { dur: 0.60, fromScale: 42, overshoot: 12 });
    animateFadeScale(t4,  T.s1_t4,  { dur: 0.50, fromScale: 86 });

    layers.push(t1, t2, t3, big, t4);

    // --- Card secondarie: 3 sopra + 2 sotto, layout centrato -----------------------------------
    var tints = [ hex(CFG.ICONS.alimentazione.main), hex(CFG.COL.accentBlue),
                  hex(CFG.ICONS.movimento.main),     hex(CFG.ICONS.recupero.main),
                  hex(CFG.ICONS.costanza.main) ];
    var slots = [
        { x: X - 300, y: 1400, w: 260 },   // DIETA
        { x: X,       y: 1400, w: 280 },   // CARDIO
        { x: X + 300, y: 1400, w: 260 },   // DETOX
        { x: X - 155, y: 1530, w: 210 },   // APP
        { x: X + 155, y: 1530, w: 240 }    // SFIDA
    ];

    var badge, tt;
    for (i = 0; i < CFG.TXT.s1_cards.length; i++) {
        badge = createGlassBadge(comp, {
            name: "CARD_0" + (i + 1), text: CFG.TXT.s1_cards[i],
            x: slots[i].x, y: slots[i].y, w: slots[i].w, h: 76,
            tint: tints[i], glow: tints[i], fontSize: 30
        });
        tt = T.s1_cardsStart + T.s1_cardsStep * i;
        // micro rotazione alternata + rimbalzo verticale: entrata viva ma pulita
        animateFadeScale(badge.bg, tt, { dur: 0.46, fromScale: 70, overshoot: 8,
                                         fromRotation: (i % 2 === 0 ? -7 : 7), offsetY: 18 });
        animateFadeScale(badge.label, tt + 0.05, { dur: 0.40, fromScale: 78 });
        layers.push(badge.bg, badge.label);
    }

    // --- Uscita di scena in blocco -------------------------------------------------------------
    for (i = 0; i < layers.length; i++) {
        animateOut(layers[i], T.s1_exit, { dur: 0.32, to: 106 });
        trim(layers[i], T.s1In, T.s1Out);
    }
    return layers;
}


// =================================================================================================
// 9. SCENA 2 — "IL DIMAGRIMENTO NON AVVIENE PER PURA MAGIA" + X ROSSA
// =================================================================================================

/** Bacchetta magica glossy: corpo vetroso, ghiera dorata, punta luminosa. */
function createMagicWand(comp, x, y) {
    var l = createShapeLayer(comp, "MAGIC_WAND", x, y);
    var c = contentsOf(l);
    var navy = hex(CFG.COL.bgNavy);
    var gold = hex(CFG.COL.accentYellow);

    // --- punta luminosa (davanti): nucleo bianco + stella + alone
    addEllipse(c, { name: "TIP_CORE", w: 30, h: 30, y: -190,
                    fill: hex(CFG.COL.white), fillOpacity: 95 });
    addStar(c,    { name: "TIP_STAR", points: 4, outer: 92, inner: 12, y: -190,
                    fill: gold, fillOpacity: 92, innerRound: 82 });
    addEllipse(c, { name: "TIP_HALO", w: 130, h: 130, y: -190, fill: gold, fillOpacity: 16 });

    // --- riflesso glossy sul corpo + ghiera
    addRect(c, { name: "WAND_GLOSS", w: 8,  h: 250, r: 4,  x: -8, y: 20,
                 fill: hex(CFG.COL.white), fillOpacity: 22 });
    addRect(c, { name: "WAND_RING",  w: 44, h: 22,  r: 8,  y: -140, fill: gold, fillOpacity: 95 });

    // --- corpo: rim luminoso, base vetrosa, alone
    addRect(c, { name: "WAND_RIM",  w: 36, h: 320, r: 18, y: 10,
                 stroke: lighten(gold, 0.30), strokeWidth: 2.5, strokeOpacity: 55 });
    addRect(c, { name: "WAND_BODY", w: 36, h: 320, r: 18, y: 10,
                 fill: lighten(navy, 0.16), fillOpacity: 100 });
    addRect(c, { name: "WAND_HALO", w: 60, h: 345, r: 30, y: 10,
                 fill: hex(CFG.COL.accentBlue), fillOpacity: 14 });

    addGlowFx(l, 62, 1.2, 42);
    if (CFG.COMP.motionBlur) l.motionBlur = true;
    return l;
}

/** Scintille attorno alla bacchetta: ogni scintilla ha pop di scala e fade sfalsati. */
function createMagicSparkles(comp, x, y, t0) {
    var l = createShapeLayer(comp, "MAGIC_SPARKLES", x, y);
    var c = contentsOf(l);
    var gold = hex(CFG.COL.accentYellow), cyan = hex(CFG.COL.accentCyan);

    // [x, y, raggio, colore, ritardo]
    var sp = [
        [-150,  -60, 26, gold, 0.00], [ 145,  -95, 30, cyan, 0.08],
        [-105, -215, 22, cyan, 0.16], [ 175,  -10, 20, gold, 0.24],
        [  95, -250, 34, gold, 0.32], [-190, -160, 18, cyan, 0.40],
        [  40, -320, 22, cyan, 0.48], [ -40,  -30, 16, gold, 0.56]
    ];

    var i, g, tr, sc, op, ts;
    for (i = 0; i < sp.length; i++) {
        g = addStar(c, { name: "SPARK_0" + (i + 1), points: 4,
                         outer: sp[i][2], inner: sp[i][2] * 0.26,
                         x: sp[i][0], y: sp[i][1],
                         fill: sp[i][3], fillOpacity: 95, innerRound: 84 });

        tr = g.property("ADBE Vector Transform Group");
        sc = tr.property("ADBE Vector Scale");
        op = tr.property("ADBE Vector Group Opacity");
        ts = t0 + sp[i][4];

        sc.setValueAtTime(ts, [0, 0]);
        sc.setValueAtTime(ts + 0.22, [120, 120]);
        sc.setValueAtTime(ts + 0.38, [100, 100]);
        easeAll(sc, 80, 55);

        op.setValueAtTime(ts, 0);
        op.setValueAtTime(ts + 0.16, 100);
        easeAll(op, 70, 70);
    }

    addGlowFx(l, 52, 1.3, 40);
    return l;
}

/** X rossa: due barre incrociate con forte glow (unico elemento rosso della grafica). */
function createMagicX(comp, x, y, size) {
    var l = createShapeLayer(comp, "MAGIC_X", x, y);
    var c = contentsOf(l);
    var red = hex(CFG.COL.red);

    addRect(c, { name: "X_BAR_A",  w: 34, h: size,      r: 17, rotation:  45,
                 fill: red, fillOpacity: 100 });
    addRect(c, { name: "X_BAR_B",  w: 34, h: size,      r: 17, rotation: -45,
                 fill: red, fillOpacity: 100 });
    addRect(c, { name: "X_HALO_A", w: 58, h: size + 18, r: 29, rotation:  45,
                 fill: red, fillOpacity: 22 });
    addRect(c, { name: "X_HALO_B", w: 58, h: size + 18, r: 29, rotation: -45,
                 fill: red, fillOpacity: 22 });

    addGlowFx(l, 70, 1.5, 38);
    if (CFG.COMP.motionBlur) l.motionBlur = true;
    return l;
}

function buildScene02(comp) {
    var T = CFG.T, X = CFG.COMP.width / 2, layers = [], i;

    // --- Bacchetta magica: entra con rotazione leggera che si assesta ---------------------------
    var wand = createMagicWand(comp, X, 700);
    animateFadeScale(wand, T.s2_wand, { dur: 0.62, fromScale: 62, overshoot: 6 });
    var wr = pRotation(wand);
    wr.setValueAtTime(T.s2_wand, -52);
    wr.setValueAtTime(T.s2_wand + 0.62, -14);
    wr.setValueAtTime(T.s2_wand + 0.90, -18);
    easeAll(wr, 85, 50);

    // --- Scintille -----------------------------------------------------------------------------
    var sparks = createMagicSparkles(comp, X, 700, T.s2_sparks);
    var so = pOpacity(sparks);
    so.setValueAtTime(T.s2_sparks, 0);
    so.setValueAtTime(T.s2_sparks + 0.10, 100);
    easeAll(so, 70, 70);

    // --- Testi ---------------------------------------------------------------------------------
    var t1 = createTextLayer(comp, { name: "TITLE_06", text: CFG.TXT.s2_line1,
        x: X, y: 1080, size: 58, color: hex(CFG.COL.textSoft), tracking: 60 });
    var t2 = createTextLayer(comp, { name: "TITLE_07", text: CFG.TXT.s2_line2,
        x: X, y: 1190, size: 104, color: hex(CFG.COL.accentYellow), tracking: 10,
        glow: { radius: 48, intensity: 0.9, threshold: 48 } });

    animateFadeScale(t1, T.s2_t1, { dur: 0.48, fromScale: 92, offsetY: 22 });
    animateFadeScale(t2, T.s2_t2, { dur: 0.55, fromScale: 80, overshoot: 8 });

    // --- X rossa sopra il concetto di "magia": scale impact dall'esterno -----------------------
    var xx = createMagicX(comp, X, 700, 330);
    animateFadeScale(xx, T.s2_x, { dur: 0.34, fromScale: 210, overshoot: -6 });

    // --- "NON È MAGIA": massimo impatto visivo -------------------------------------------------
    var stamp = createTextLayer(comp, { name: "TITLE_08_NON_E_MAGIA", text: CFG.TXT.s2_stamp,
        x: X, y: 1420, size: 132, color: hex(CFG.COL.red), tracking: 0,
        glow: { radius: 62, intensity: 1.3, threshold: 40 } });
    animateFadeScale(stamp, T.s2_stamp, { dur: 0.40, fromScale: 150, overshoot: -5 });
    var sr = pRotation(stamp);
    sr.setValueAtTime(T.s2_stamp, -4);
    sr.setValueAtTime(T.s2_stamp + 0.42, 0);
    easeAll(sr, 80, 60);

    layers.push(wand, sparks, t1, t2, xx, stamp);

    // --- Uscita di scena -----------------------------------------------------------------------
    for (i = 0; i < layers.length; i++) {
        animateOut(layers[i], T.s2_exit, { dur: 0.30, to: 92 });
        trim(layers[i], T.s2In, T.s2Out);
    }
    return layers;
}


// =================================================================================================
// 10. SCENA 3 — SISTEMA "PERCORSO" + 5 ICONE COLLEGATE
// =================================================================================================

/** Nodo centrale: badge circolare glossy con doppio anello e respiro luminoso. */
function createCenterNode(comp, x, y, r) {
    var l = createShapeLayer(comp, "CENTER_PERCORSO", x, y);
    var c = contentsOf(l);
    var navy = hex(CFG.COL.bgNavy);
    var blue = hex(CFG.COL.accentBlue);
    var cyan = hex(CFG.COL.accentCyan);
    var D = r * 2;

    // riflessi glossy in alto
    addEllipse(c, { name: "GLOSS_HI",   w: D * 0.42, h: D * 0.11, y: -r * 0.66,
                    fill: hex(CFG.COL.white), fillOpacity: 30 });
    addEllipse(c, { name: "GLOSS_TOP",  w: D * 0.78, h: D * 0.40, y: -r * 0.40,
                    fill: hex(CFG.COL.white), fillOpacity: 12 });

    // anelli: interno tenue + medio cyan + rim neon esterno
    addEllipse(c, { name: "RING_INNER", w: D * 0.80, h: D * 0.80,
                    stroke: hex(CFG.COL.white), strokeWidth: 1.5, strokeOpacity: 22 });
    addEllipse(c, { name: "RING_MID",   w: D * 0.94, h: D * 0.94,
                    stroke: cyan, strokeWidth: 2, strokeOpacity: 45 });
    addEllipse(c, { name: "RIM",        w: D - 3, h: D - 3,
                    stroke: blue, strokeWidth: 4.5, strokeOpacity: 95 });

    // corpo vetroso + alone + ombra
    addEllipse(c, { name: "BODY_TINT",  w: D * 0.96, h: D * 0.96, fill: blue, fillOpacity: 26 });
    addEllipse(c, { name: "BODY",       w: D, h: D, fill: mix(navy, blue, 0.18), fillOpacity: 100 });
    addEllipse(c, { name: "HALO",       w: D * 1.22, h: D * 1.22, fill: blue, fillOpacity: 15 });
    addEllipse(c, { name: "SHADOW",     w: D + 6, h: D + 6, y: r * 0.14,
                    fill: hex(CFG.COL.black), fillOpacity: 55 });

    var fx = addGlowFx(l, 60, 1.15, 45);
    addGlowPulse(fx, 1.15, 0.35, 2.2);          // respiro luminoso continuo
    if (CFG.COMP.motionBlur) l.motionBlur = true;
    return l;
}

function buildScene03(comp) {
    var T = CFG.T, X = CFG.COMP.width / 2, layers = [], i, d, pal;
    var CX = X, CY = 1010, CR = 150;            // centro e raggio del nodo "PERCORSO"

    // --- Titoli --------------------------------------------------------------------------------
    var t1 = createTextLayer(comp, { name: "TITLE_09", text: CFG.TXT.s3_line1,
        x: X, y: 300, size: 74, color: hex(CFG.COL.textMain), tracking: 30 });
    var t2 = createTextLayer(comp, { name: "TITLE_10", text: CFG.TXT.s3_line2,
        x: X, y: 400, size: 82, color: hex(CFG.COL.accentYellow), tracking: 30,
        glow: { radius: 44, intensity: 0.85, threshold: 48 } });
    animateFadeScale(t1, T.s3_t1, { dur: 0.55, fromScale: 88, offsetY: 28 });
    animateFadeScale(t2, T.s3_t2, { dur: 0.55, fromScale: 84, overshoot: 6 });
    layers.push(t1, t2);

    // --- Nodo centrale (compare per primo) -----------------------------------------------------
    var center = createCenterNode(comp, CX, CY, CR);
    animateFadeScale(center, T.s3_center, { dur: 0.60, fromScale: 40, overshoot: 10 });

    var centerLabel = createTextLayer(comp, { name: "CENTER_PERCORSO_LABEL",
        text: CFG.TXT.s3_center, x: CX, y: CY, size: 46,
        color: hex(CFG.COL.textMain), tracking: 60 });
    animateFadeScale(centerLabel, T.s3_centerLabel, { dur: 0.45, fromScale: 72 });
    layers.push(center, centerLabel);

    // --- Le 5 icone: 1 sopra, 2 laterali, 2 in basso -------------------------------------------
    var S = 172;
    var defs = [
        { key: "alimentazione", name: "ICON_ALIMENTAZIONE", x: CX,       y: CY - 400,
          symbolFn: createFoodIcon },
        { key: "allenamento",   name: "ICON_ALLENAMENTO",   x: CX - 330, y: CY -  60,
          symbolFn: createDumbbellIcon },
        { key: "movimento",     name: "ICON_MOVIMENTO",     x: CX + 330, y: CY -  60,
          symbolFn: createMovementIcon },
        { key: "recupero",      name: "ICON_RECUPERO",      x: CX - 230, y: CY + 318,
          symbolFn: createSleepIcon },
        { key: "costanza",      name: "ICON_COSTANZA",      x: CX + 230, y: CY + 318,
          symbolFn: createRepeatIcon }
    ];

    // --- Connettori: un solo layer "CONNECTORS" con 5 linee a Trim Paths animati ---------------
    var connLayer = createShapeLayer(comp, "CONNECTORS", 0, 0);
    var connTrims = [];
    for (i = 0; i < defs.length; i++) {
        d = defs[i]; pal = CFG.ICONS[d.key];
        connTrims.push(createConnectorLine(connLayer, {
            name: "LINK_" + d.key.toUpperCase(),
            x1: CX, y1: CY, x2: d.x, y2: d.y,
            startGap: CR + 8,        // parte appena fuori dal nodo centrale
            endGap:   S * 0.60,      // arriva appena prima dell'icona
            color: hex(pal.glow)
        }));
    }
    addGlowFx(connLayer, 34, 0.8, 50);
    for (i = 0; i < connTrims.length; i++) {
        animateConnector(connTrims[i], T.s3_connStart + T.s3_connStep * i, 0.50);
    }
    layers.push(connLayer);

    // --- Icone: entrano una alla volta, in sequenza ordinata -----------------------------------
    var ico, tt;
    for (i = 0; i < defs.length; i++) {
        d = defs[i]; pal = CFG.ICONS[d.key];

        ico = createGlossyIcon(comp, {
            name: d.name, label: CFG.TXT.icon_labels[d.key],
            x: d.x, y: d.y, size: S,
            main:   hex(pal.main),
            second: hex(pal.second),
            glow:   hex(pal.glow),
            symbolFn: d.symbolFn
        });

        tt = T.s3_iconsStart + T.s3_iconsStep * i;
        animateFadeScale(ico.icon,  tt,        { dur: 0.52, fromScale: 46, overshoot: 9 });
        animateFadeScale(ico.label, tt + 0.10, { dur: 0.42, fromScale: 78, offsetY: 12 });

        // glow pulse leggero, sfalsato per ogni icona
        addGlowPulse(ico.glowFx, 1.0, 0.30, 2.0 + i * 0.18);

        layers.push(ico.icon, ico.label);
    }

    // --- Frase finale (tenuta sopra la zona UI di Instagram) -----------------------------------
    var fin = createTextLayer(comp, { name: "TITLE_11_FINAL", text: CFG.TXT.s3_final,
        x: X, y: 1618, size: 40, color: hex(CFG.COL.textSoft), tracking: 70,
        font: FONT_MED, leadingRatio: 1.42 });
    animateFadeScale(fin, T.s3_final, { dur: 0.60, fromScale: 92, offsetY: 20 });
    layers.push(fin);

    // --- Pulse finale sul centro ---------------------------------------------------------------
    animatePulse(center, T.s3_pulse, 7, 0.75);
    animatePulse(centerLabel, T.s3_pulse, 5, 0.75);

    // --- Trim di scena: tutto il sistema resta leggibile fino alla fine -------------------------
    for (i = 0; i < layers.length; i++) trim(layers[i], T.s3In, T.s3Out);
    return layers;
}


// =================================================================================================
// 11. MARKER — punti di sync per la voce
// =================================================================================================

function addMarkers(comp) {
    var mp = comp.markerProperty, i;
    for (i = 0; i < CFG.MARKERS.length; i++) {
        mp.setValueAtTime(CFG.MARKERS[i][0], new MarkerValue(CFG.MARKERS[i][1]));
    }
}


// =================================================================================================
// 12. MAIN
// =================================================================================================

function main() {
    if (!app.project) app.newProject();

    app.beginUndoGroup("Crea Reel Dimagrimento 1080x1920");

    try {
        // Font risolti una sola volta e riusati da tutti i testi
        FONT_BOLD = pickFont(CFG.FONTS.bold);
        FONT_MED  = pickFont(CFG.FONTS.med);

        // --- Cartella di progetto + composizione ------------------------------------------------
        var folder = app.project.items.addFolder("REEL_DIMAGRIMENTO");

        var comp = app.project.items.addComp(
            CFG.COMP.name, CFG.COMP.width, CFG.COMP.height, 1,
            CFG.COMP.duration, CFG.COMP.fps
        );
        comp.parentFolder = folder;
        comp.bgColor      = hex(CFG.COL.bgDeep);
        comp.motionBlur   = CFG.COMP.motionBlur;
        try { comp.shutterAngle = 180; comp.shutterPhase = -90; } catch (e) {}

        // --- Costruzione: l'ordine di creazione definisce lo stacking (gli ultimi stanno sopra) -
        buildBackground(comp);
        buildScene01(comp);
        buildScene02(comp);
        buildScene03(comp);
        addMarkers(comp);

        comp.openInViewer();

        alert("Reel creato ✔\r\r" +
              "Comp: " + CFG.COMP.name + "\r" +
              CFG.COMP.width + "x" + CFG.COMP.height + " · " +
              CFG.COMP.fps + "fps · " + CFG.COMP.duration + "s\r\r" +
              "Font titoli: " + FONT_BOLD + "\r" +
              "Font secondari: " + FONT_MED + "\r\r" +
              "Testi, colori e tempi si modificano nell'oggetto CFG in cima allo script.");

    } catch (err) {
        alert("Errore durante la creazione del reel:\r\r" +
              err.toString() + "\rLinea: " + (err.line || "?"));
    } finally {
        app.endUndoGroup();
    }
}

main();

})();
