import React, { useMemo, useState, useEffect } from "react";
import { Download, Plus, Trash2, RotateCcw, FileText, Lock, TreePine } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TAVOLE_PRECARICATE from "./tavole_trentine.json";

/* ====================== UI LOCALI (senza librerie esterne UI) ====================== */
const cx = (...a) => a.filter(Boolean).join(" ");

const Card = ({ className = "", children }) => (
  <div className={cx("rounded-2xl border border-green-200 bg-white shadow-sm", className)}>{children}</div>
);
const CardHeader = ({ className = "", children }) => (
  <div className={cx("p-4 border-b border-green-100", className)}>{children}</div>
);
const CardTitle = ({ className = "", children }) => (
  <div className={cx("text-lg font-semibold text-green-900", className)}>{children}</div>
);
const CardContent = ({ className = "", children }) => <div className={cx("p-4", className)}>{children}</div>;

const Button = ({ className = "", variant = "default", size = "md", children, ...props }) => {
  const base = "inline-flex items-center justify-center rounded-xl border transition active:scale-[0.98]";
  const variants = {
    default: "bg-green-600 text-white border-green-600 hover:bg-green-700",
    secondary: "bg-white text-green-700 border-green-200 hover:bg-green-50",
    destructive: "bg-red-500 text-white border-red-500 hover:bg-red-600",
  };
  const sizes = { sm: "px-2 py-1 text-sm", md: "px-3 py-2 text-sm", lg: "px-4 py-2.5" };
  return (
    <button className={cx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={cx(
      "w-full rounded-lg border border-green-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300",
      className
    )}
    {...props}
  />
);

const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={cx(
      "w-full rounded-lg border border-green-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300",
      className
    )}
    {...props}
  />
);
/* =================================================================================== */

// Elenco specie per menu (dalle tavole precaricate)
const SPECIE_LIST = Object.keys(TAVOLE_PRECARICATE);

const fmt = (x) => (isFinite(x) ? x.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : "-");
const clampInt = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);

export default function AppPiedilistaOmezzolli() {
  // Parametri classi
  const [classStart, setClassStart] = useState(17.5);
  const [classWidth, setClassWidth] = useState(5);
  const [numClasses, setNumClasses] = useState(12);

  // Specie iniziali con nomi *coerenti* al JSON (così aggancia subito)
  const [species, setSpecies] = useState([
    { id: crypto.randomUUID(), name: "Abete rosso", f: 0.45, H: 22, useHeight: false, tariffe: {}, tariffaSel: "1" },
    { id: crypto.randomUUID(), name: "Abete bianco", f: 0.45, H: 22, useHeight: false, tariffe: {}, tariffaSel: "1" },
    { id: crypto.randomUUID(), name: "Larice", f: 0.45, H: 22, useHeight: false, tariffe: {}, tariffaSel: "1" },
    { id: crypto.randomUUID(), name: "Pino silvestre", f: 0.45, H: 22, useHeight: false, tariffe: {}, tariffaSel: "1" },
    { id: crypto.randomUUID(), name: "Faggio", f: 0.45, H: 20, useHeight: false, tariffe: {}, tariffaSel: "1" },
    { id: crypto.randomUUID(), name: "Pino cembro", f: 0.45, H: 20, useHeight: false, tariffe: {}, tariffaSel: "1" },
  ]);

  // Dati lavoro
  const [counts, setCounts] = useState({}); // per specie → array per classe
  const [heightsBySpecies, setHeightsBySpecies] = useState({}); // per specie → H per classe
  const [activeCountSpeciesId, setActiveCountSpeciesId] = useState(null); // per conteggio rapido

  // Accesso
  const [accessGranted, setAccessGranted] = useState(false);
  const accessCode = "7792";

// CENTRI CLASSE FISSI: 10, 15, 20, ..., 85  (niente 5 cm)
const classMids = useMemo(
  () => Array.from({ length: 16 }, (_, i) => 10 + i * 5), // 10 → 85
  []
);

// Numero classi derivato (sempre 16)
const NUM_CLASSES = classMids.length;

// Etichetta visuale: 10→"00", 15→"0", 20→"1", ..., 85→"14"
const classLabel = (d) => {
  const rd = Math.round(d);
  if (rd === 10) return "00";
  if (rd === 15) return "0";
  if (rd >= 20) return String(((rd - 20) / 5) + 1); // 20->1, 25->2, ... 85->14
  return String(rd); // fallback (non dovrebbe servire)
};


  // Normalizzazione conteggi rispetto al numero classi corrente
  const normalizedCounts = useMemo(() => {
  const obj = {};
  species.forEach((sp) => {
    const arr = counts[sp.id] ?? Array(NUM_CLASSES).fill(0);
    obj[sp.id] = arr
      .slice(0, NUM_CLASSES)
      .concat(Array(Math.max(0, NUM_CLASSES - arr.length)).fill(0));
  });
  return obj;
}, [species, counts, NUM_CLASSES]);

  const setCount = (spId, idx, val) => {
    setCounts((prev) => {
      const copy = { ...prev };
      const arr = (copy[spId] ?? Array(NUM_CLASSES).fill(0)).slice();
      arr[idx] = clampInt(val);
      copy[spId] = arr;
      return copy;
    });
  };

  const incCount = (spId, idx, delta) => {
    setCounts((prev) => {
      const copy = { ...prev };
      const arr = (copy[spId] ?? Array(NUM_CLASSES).fill(0)).slice();
      const next = clampInt((arr[idx] ?? 0) + delta);
      arr[idx] = next;
      copy[spId] = arr;
      return copy;
    });
  };

  // Aggiungi specie (menu a tendina: parte dalla prima specie del JSON)
  const addSpecies = () => {
    const defaultName = SPECIE_LIST[0] || "Abete rosso";
    setSpecies((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: defaultName,
        f: 0.45,
        H: 20,
        useHeight: false,
        tariffe: { ...(TAVOLE_PRECARICATE[defaultName] || {}) },
        tariffaSel: "1",
      },
    ]);
  };

  const removeSpecies = (id) => {
    if (!confirm("Rimuovere la specie e i relativi conteggi?")) return;
    setSpecies((prev) => prev.filter((s) => s.id !== id));
    setCounts((prev) => {
      const cp = { ...prev }; delete cp[id]; return cp;
    });
    setHeightsBySpecies((prev) => {
      const cp = { ...prev }; delete cp[id]; return cp;
    });
  };

  // Parser CSV "diametro;volume" (manteniamo per eventuali usi futuri)
  const parseCSV = (text) => {
    const map = new Map();
    text
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter((r) => r && !r.startsWith("#"))
      .forEach((row) => {
        const [dStr, vStr] = row.split(/[,;\t]/).map((s) => s.trim());
        const d = parseFloat(dStr?.replace(",", "."));
        const v = parseFloat(vStr?.replace(",", "."));
        if (isFinite(d) && isFinite(v)) map.set(+d.toFixed(1), v);
      });
    return map;
  };

  // Volume per pianta: tariffa selezionata (precaricata) oppure f·G·H se useHeight
  const vPerPianta = (sp, dMid, Hopt) => {
    const csv = sp?.tariffe?.[sp.tariffaSel];
    if (csv) {
      // csv può essere oggetto { "5.0": 0.051, ... } (dal JSON) o stringa CSV
      if (typeof csv === "string") {
        const map = parseCSV(csv);
        const key = +dMid.toFixed(1);
        if (map.has(key)) return map.get(key);
        const keys = Array.from(map.keys()).sort((a, b) => a - b);
        let lo = null, hi = null;
        for (const k of keys) {
          if (k < key) lo = k;
          if (k > key) { hi = k; break; }
        }
        if (lo != null && hi != null) {
          const t = (key - lo) / (hi - lo);
          return map.get(lo) + (map.get(hi) - map.get(lo)) * t;
        }
        if (lo != null) return map.get(lo);
        if (hi != null) return map.get(hi);
        return 0;
      } else {
        const keyStr = dMid.toFixed(1);
        if (csv[keyStr] != null) return csv[keyStr];
        // interpolazione lineare
        const keys = Object.keys(csv).map(parseFloat).sort((a,b)=>a-b);
        const x = +dMid.toFixed(1);
        let lo = null, hi = null;
        for (const k of keys) {
          if (k < x) lo = k;
          if (k > x) { hi = k; break; }
        }
        if (lo != null && hi != null) {
          const vlo = csv[lo.toFixed(1)], vhi = csv[hi.toFixed(1)];
          const t = (x - lo) / (hi - lo);
          return vlo + (vhi - vlo) * t;
        }
        if (lo != null) return csv[lo.toFixed(1)];
        if (hi != null) return csv[hi.toFixed(1)];
        return 0;
      }
    }
    if (Hopt) {
      const G = Math.PI * Math.pow(dMid / 200, 2);
      return (sp.f ?? 0.45) * G * Hopt;
    }
    return 0;
  };

  // Calcoli
  const results = useMemo(() => {
    const perSpecies = species.map((sp) => {
      const arr = normalizedCounts[sp.id] ?? Array(NUM_CLASSES).fill(0);
      let N = 0, G = 0, V = 0;
      const rows = classMids.map((d, i) => {
        const n = clampInt(arr[i] ?? 0);
        const gPer = Math.PI * Math.pow(d / 200, 2);
        const Harr = heightsBySpecies[sp.id] ?? [];
        const Huse = sp.useHeight ? (Number.isFinite(Harr[i]) ? Harr[i] : sp.H) : null;
        const vPer = sp.useHeight ? (sp.f * gPer * (Number.isFinite(Huse) ? Huse : 0)) : vPerPianta(sp, d);
        const g = n * gPer;
        const v = n * vPer;
        N += n; G += g; V += v;
        return { d, n, gPer, vPer, g, v };
      });
      return { sp, rows, N, G, V };
    });
    const totals = perSpecies.reduce((acc, s) => ({
      N: acc.N + s.N,
      G: acc.G + s.G,
      V: acc.V + s.V,
    }), { N: 0, G: 0, V: 0 });
    return { perSpecies, totals };
  }, [species, normalizedCounts, classMids, heightsBySpecies]);

  // Reset conteggi
  const resetCounts = () => {
    if (!confirm("Azzerare tutti i conteggi?")) return;
    const empty = {};
    species.forEach((sp) => (empty[sp.id] = Array(NUM_CLASSES).fill(0)));
    setCounts(empty);
  };

const exportCSV = () => {
  const header = ["Specie", ...classMids.map((d) => `Classe ${classLabel(d)}`), "N_tot", "G_tot_m2", "V_tot_m3"];
  const lines = [header.join(";")];
  results.perSpecies.forEach(({ sp, rows, N, G, V }) => {
    const countsRow = [sp.name, ...rows.map((r) => r.n), N, G.toFixed(3), V.toFixed(3)];
    lines.push(countsRow.join(";"));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "piedilista_cubatura.csv";
  a.click();
  URL.revokeObjectURL(url);
};


  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Resoconto App Piedilista Omezzolli", 14, 16);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("it-IT")} - Utente: Omezzolli`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Specie", "N", "%N", "V (m³)", "%V", "Tariffa/H"]],
      body: results.perSpecies
        .map(({ sp, N, V }) => {
          const pN = results.totals.N ? (100 * N) / results.totals.N : 0;
          const pV = results.totals.V ? (100 * V) / results.totals.V : 0;
          const tag = sp.useHeight ? `H` : `Tar. ${sp.tariffaSel}`;
          return [sp.name, fmt(N), fmt(pN), fmt(V), fmt(pV), tag];
        })
        .concat([["Totale", fmt(results.totals.N), "100", fmt(results.totals.V), "100", ""]]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Classe", "N", "V (m³)"]],
      body: classMids.map((d, i) => {
        let Nclass = 0, Vclass = 0;
        results.perSpecies.forEach(({ rows }) => { Nclass += rows[i].n; Vclass += rows[i].v; });
        return [classLabel(d), fmt(Nclass), fmt(Vclass)];
      })
    });

    doc.save("resoconto_piedilista.pdf");
  };

  // Carica stato salvato
  useEffect(() => {
    try {
      const raw = localStorage.getItem("piedilista_state_v3");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.species) setSpecies(data.species);
        if (data.counts) setCounts(data.counts);
        if (data.heightsBySpecies) setHeightsBySpecies(data.heightsBySpecies);
        if (data.classStart) setClassStart(data.classStart);
        if (data.classWidth) setClassWidth(data.classWidth);
        
      }
    } catch {}
  }, []);

  // Precarica Tavole Trentine (una volta sola) per le specie presenti
  useEffect(() => {
    try {
      if (localStorage.getItem("tavole_precaricate_v1")) return; // già fatto
      setSpecies(prev =>
        prev.map(sp => {
          const hit = SPECIE_LIST.find(k => k.trim().toLowerCase() === sp.name.trim().toLowerCase());
          if (!hit) return sp;
          return { ...sp, tariffe: { ...(sp.tariffe || {}), ...TAVOLE_PRECARICATE[hit] } };
        })
      );
      localStorage.setItem("tavole_precaricate_v1", "ok");
    } catch {}
  }, []);

  // Salvataggio automatico
useEffect(() => {
  const payload = { species, counts, heightsBySpecies, classStart, classWidth, NUM_CLASSES };
  try { localStorage.setItem("piedilista_state_v3", JSON.stringify(payload)); } catch {}
}, [species, counts, heightsBySpecies, classStart, classWidth, NUM_CLASSES]);


  // Schermata accesso
  if (!accessGranted) {
    let inputCode = "";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-200 to-green-400">
        <Card className="p-8 shadow-lg text-center">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" /> Accesso Riservato
            </CardTitle>
          </CardHeader>
        <CardContent>
          <p className="mb-4">Inserisci il codice di accesso per aprire l'App Piedilista Omezzolli</p>
          <Input type="password" placeholder="Codice" onChange={(e)=>{inputCode = e.target.value;}} />
          <Button className="mt-4" onClick={()=>{ if(inputCode === accessCode) setAccessGranted(true); else alert("Codice errato"); }}>Entra</Button>
        </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <TreePine className="w-8 h-8 text-green-700" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-800">App Piedilista Omezzolli</h1>
              <p className="text-sm md:text-base text-neutral-700 mt-1">
                Conta piante per specie in classi di <span className="font-medium">{classWidth} cm</span> a partire da <span className="font-medium">{fmt(classStart)} cm</span>.<br/>
                Volume da <b>Tariffe Trentine 1–9</b> precaricate (oppure da <b>altezza</b> f·G·H se attivi l’opzione).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} className="flex items-center gap-2"><Download className="w-4 h-4" /> CSV</Button>
            <Button onClick={exportPDF} className="flex items-center gap-2"><FileText className="w-4 h-4" /> PDF</Button>
            <Button variant="secondary" onClick={resetCounts} className="flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Azzera</Button>
          </div>
        </header>

        {/* Resoconto sempre visibile */}
        <Card className="shadow-md border-green-200">
          <CardHeader><CardTitle>Resoconto parziale</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-medium mb-2">Composizione per specie</div>
              <div className="overflow-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Specie</th>
                      <th className="text-right p-2">N</th>
                      <th className="text-right p-2">%N</th>
                      <th className="text-right p-2">V (m³)</th>
                      <th className="text-right p-2">%V</th>
                      <th className="text-right p-2">Tariffa/H</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.perSpecies.map(({ sp, N, V }) => {
                      const pN = results.totals.N ? (100 * N) / results.totals.N : 0;
                      const pV = results.totals.V ? (100 * V) / results.totals.V : 0;
                      const tag = sp.useHeight ? "H" : `Tar. ${sp.tariffaSel}`;
                      return (
                        <tr key={sp.id} className="odd:bg-neutral-50">
                          <td className="p-2">{sp.name}</td>
                          <td className="p-2 text-right">{fmt(N)}</td>
                          <td className="p-2 text-right">{fmt(pN)}</td>
                          <td className="p-2 text-right">{fmt(V)}</td>
                          <td className="p-2 text-right">{fmt(pV)}</td>
                          <td className="p-2 text-right">{tag}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-white border-t font-semibold">
                      <td className="p-2 text-right">Totale</td>
                      <td className="p-2 text-right">{fmt(results.totals.N)}</td>
                      <td className="p-2 text-right">100</td>
                      <td className="p-2 text-right">{fmt(results.totals.V)}</td>
                      <td className="p-2 text-right">100</td>
                      <td className="p-2 text-right"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="font-medium mb-2">Ripartizione per classi</div>
              <div className="overflow-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Classe</th>
                      <th className="text-right p-2">N</th>
                      <th className="text-right p-2">V (m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classMids.map((d, i) => {
                      let Nclass = 0, Vclass = 0;
                      results.perSpecies.forEach(({ rows }) => { Nclass += rows[i].n; Vclass += rows[i].v; });
                      return (
                        <tr key={d} className="odd:bg-neutral-50">
                          <td className="p-2">{classLabel(d)}</td>
                          <td className="p-2 text-right">{fmt(Nclass)}</td>
                          <td className="p-2 text-right">{fmt(Vclass)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parametri classi */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Parametri classi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-neutral-600 mb-1">Centro classe iniziale (cm)</div>
              <Input type="number" step="0.1" value={classStart} onChange={(e)=>setClassStart(parseFloat(e.target.value||17.5))}/>
            </div>
            <div>
              <div className="text-xs text-neutral-600 mb-1">Larghezza classe (cm)</div>
              <Input type="number" step="0.1" value={classWidth} onChange={(e)=>setClassWidth(parseFloat(e.target.value||5))}/>
            </div>
            <div>
              <div className="text-xs text-neutral-600 mb-1">Numero classi</div>
              <Input type="number" value={numClasses} onChange={(e)=>setNumClasses(parseInt(e.target.value||12))}/>
            </div>
          </CardContent>
        </Card>

        {/* Specie */}
        <Card className="shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Specie</CardTitle>
            <Button variant="secondary" onClick={addSpecies}><Plus className="w-4 h-4 mr-1"/>Aggiungi specie</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 font-medium text-sm text-neutral-600">
              <div className="md:col-span-4">Specie</div>
              <div className="md:col-span-2">Tariffa · Opzioni</div>
            </div>

            {species.map((sp)=>(
              <div key={sp.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                {/* MENU SPECIE */}
                <select
                  className="md:col-span-4 w-full rounded-lg border border-green-200 px-3 py-2 text-sm"
                  value={sp.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSpecies((prev) =>
                      prev.map((x) =>
                        x.id === sp.id
                          ? {
                              ...x,
                              name: newName,
                              tariffe: { ...(x.tariffe || {}), ...(TAVOLE_PRECARICATE[newName] || {}) },
                              tariffaSel: x.tariffaSel && TAVOLE_PRECARICATE[newName]?.[x.tariffaSel] ? x.tariffaSel : "1",
                            }
                          : x
                      )
                    );
                  }}
                >
                  {SPECIE_LIST.map((nome) => (
                    <option key={nome} value={nome}>{nome}</option>
                  ))}
                </select>

                <div className="md:col-span-2 flex flex-col gap-2">
                  {/* Selettore tariffa 1–9 */}
                  <div className="flex items-center gap-2">
                    <select
                      className="w-28 rounded-lg border border-green-200 px-2 py-2 text-sm"
                      value={sp.tariffaSel || "1"}
                      onChange={(e) =>
                        setSpecies(prev =>
                          prev.map(x => x.id === sp.id ? { ...x, tariffaSel: e.target.value } : x)
                        )
                      }
                    >
                      {Array.from({ length: 9 }, (_, i) => String(i + 1)).map(n => (
                        <option key={n} value={n}>Tariffa {n}</option>
                      ))}
                    </select>

                    {/* Alternativa: usa altezza (f·G·H) */}
                    <Button type="button" variant={sp.useHeight? "default":"secondary"} onClick={()=>setSpecies(prev=>prev.map(x=>x.id===sp.id?{...x, useHeight:!x.useHeight}:x))}>
                      {sp.useHeight? "Usa altezza: ON":"Usa altezza: OFF"}
                    </Button>
                    <Button type="button" variant="destructive" onClick={()=>removeSpecies(sp.id)} title="Rimuovi specie">
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>

                  {/* Badge: stato tariffa */}
                  {(() => {
                    const t = species.find(x => x.id === sp.id)?.tariffe?.[sp.tariffaSel];
                    const ok = t && (typeof t === "string" ? t.trim().length > 0 : Object.keys(t).length > 0);
                    return (
                      <span className={ok ? "text-green-700 text-xs" : "text-red-600 text-xs"}>
                        {ok ? "Tariffa caricata" : "Tariffa NON trovata per questa specie"}
                      </span>
                    );
                  })()}
                </div>

                {/* Se useHeight è ON: H per classe */}
                {sp.useHeight && (
                  <div className="md:col-span-6 mt-2 border rounded-xl p-4 bg-green-50">
                    <div className="font-medium mb-2">Altezza per classe (V = f·G·H)</div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-neutral-600 mb-1">Fattore di forma f</div>
                        <Input type="number" step="0.01" value={sp.f}
                          onChange={(e)=>setSpecies(prev=>prev.map(x=>x.id===sp.id?{...x, f: parseFloat(e.target.value||0)}:x))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-neutral-600 mb-1">Altezza H di default (m)</div>
                        <Input type="number" step="0.1" value={sp.H}
                          onChange={(e)=>setSpecies(prev=>prev.map(x=>x.id===sp.id?{...x, H: parseFloat(e.target.value||0)}:x))}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-neutral-600 mb-2">
                      Puoi indicare H per classe; se vuoto usa H di default.
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {classMids.map((d, idx)=> (
                        <div key={d} className="bg-white border rounded-xl p-2">
                          <div className="text-xs text-neutral-500 mb-1">Classe {classLabel(d)}</div>
                          <Input type="number" step="0.1" placeholder="H (m)"
                            value={heightsBySpecies[sp.id]?.[idx] ?? ""}
                            onChange={(e)=>{
                              const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                              setHeightsBySpecies(prev=>{
                                const existing = prev[sp.id] ?? Array(NUM_CLASSES).fill(NaN);
				const arr = existing
  				.slice(0, NUM_CLASSES)
  				.concat(Array(Math.max(0, NUM_CLASSES - existing.length)).fill(NaN));
				arr[idx] = val;
				return { ...prev, [sp.id]: arr };

                              })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conteggio rapido */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Conteggio rapido in campo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {species.map((sp)=>(
                <Button key={sp.id} variant={activeCountSpeciesId===sp.id? "default":"secondary"} onClick={()=>setActiveCountSpeciesId(sp.id)} className="rounded-2xl">
                  {sp.name}
                </Button>
              ))}
            </div>

            {activeCountSpeciesId && (
              <div className="space-y-3">
                <div className="text-sm text-neutral-600">Specie attiva: <b>{species.find((s)=>s.id===activeCountSpeciesId)?.name}</b></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {classMids.map((d, idx)=>(
                    <div key={d} className="border rounded-2xl p-2 bg-white">
                      <div className="text-xs text-neutral-500">Classe {classLabel(d)}</div>
                      <div className="text-xl font-semibold">{normalizedCounts[activeCountSpeciesId]?.[idx] ?? 0}</div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="grow" onClick={()=>incCount(activeCountSpeciesId, idx, +1)}>+1</Button>
                        <Button size="sm" variant="secondary" onClick={()=>incCount(activeCountSpeciesId, idx, -1)}>-1</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit manuale conteggi */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Modifica conteggi per specie e classe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {species.map((sp)=>(
              <div key={sp.id} className="space-y-2">
                <div className="font-medium">{sp.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {classMids.map((d, idx)=>(
                    <div key={d} className="border rounded-xl p-2">
                      <div className="text-xs text-neutral-500 mb-1">Classe {classLabel(d)}</div>
                      <Input type="number" value={normalizedCounts[sp.id]?.[idx] ?? 0}
                        onChange={(e)=>setCount(sp.id, idx, parseInt(e.target.value||0))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
