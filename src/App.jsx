import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

/**
 * Minimal UI primitives (no external UI lib required)
 */
function Button({ children, onClick, variant = "default", className = "", title }) {
  const base = "px-3 py-2 rounded font-semibold transition text-sm";
  const styles =
    variant === "default"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : variant === "outline"
      ? "border border-black/40 text-black hover:bg-black/5"
      : variant === "ghost"
      ? "text-black/80 hover:bg-black/5"
      : "";
  return (
    <button onClick={onClick} title={title} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

function CardShell({ children }) {
  return <div className="relative max-w-md bg-white text-black rounded-2xl shadow-xl p-6">{children}</div>;
}

function CardContent({ children }) {
  return <div>{children}</div>;
}

/**
 * App
 */
export default function App() {
  // Modes: auto (mix both), info, dilemme
  const [mode, setMode] = useState("auto");

  // Data from Google Sheet (dynamic)
  const [cards, setCards] = useState({ info: [], dilemme: [] });
  const [allCategories, setAllCategories] = useState([]); // unique from CSV

  // UI state
  const [selectedCategories, setSelectedCategories] = useState([]); // multi-select
  const [showFilters, setShowFilters] = useState(false); // hide/show categories chips
  const [showIntro, setShowIntro] = useState(true); // intro overlay

  // Game state
  const [card, setCard] = useState(null); // current card
  const [showGuide, setShowGuide] = useState(false);
  const [playedIds, setPlayedIds] = useState(new Set()); // IDs of cards seen this session
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // --- Load CSV ---
  useEffect(() => {
    const fetchData = async () => {
      const url =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7zxUp9lhRfav7Ax-IEVnsIGP_z6O5AxisPe7y0rj4r5FEKfGCgqKp3L7xXsSJc7Xl6rB35MdzlT_r/pub?gid=0&single=true&output=csv";
      const response = await fetch(url);
      const text = await response.text();
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          const info = [];
          const dilemme = [];
          results.data.forEach((row, i) => {
            const type = (row.type || "").trim();
            if (!type) return; // skip empty lines
            const base = {
              id: `${type}-${i}`,
              type,
              category: row.category?.trim() || "Autre",
              question: row.question || "",
              guide: row.guide || "",
              source: row.source || "",
            };
            if (type === "info") {
              info.push({ ...base, info: row["info / situation"] || "" });
            } else if (type === "dilemme") {
              dilemme.push({ ...base, situation: row["info / situation"] || "" });
            }
          });
          setCards({ info, dilemme });
          const cats = Array.from(new Set([...info, ...dilemme].map((c) => c.category))).sort();
          setAllCategories(cats);
          setLoaded(true);
        },
      });
    };
    fetchData();
  }, []);

  // Effective list depending on mode (auto = both)
  const effective = useMemo(() => {
    if (mode === "auto") return [...(cards.info || []), ...(cards.dilemme || [])];
    return cards[mode] || [];
  }, [cards, mode]);

  // Apply category filters
  const pool = useMemo(() => {
    return selectedCategories.length === 0
      ? effective
      : effective.filter((c) => selectedCategories.includes(c.category));
  }, [effective, selectedCategories]);

  // Per-category counts for current effective list
  const perCategoryTotals = useMemo(() => {
    const counts = new Map();
    (effective || []).forEach((c) => {
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts; // Map(category -> total)
  }, [effective]);

  const perCategoryPlayed = useMemo(() => {
    const counts = new Map();
    (effective || []).forEach((c) => {
      if (playedIds.has(c.id)) counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts; // Map(category -> played)
  }, [effective, playedIds]);

  // Draw logic (no repetition until session reset)
  const pickCard = () => {
    const available = pool.filter((c) => !playedIds.has(c.id));
    if (available.length === 0) {
      setHasCompleted(true);
      return;
    }
    const next = available[Math.floor(Math.random() * available.length)];
    setCard(next);
    setShowGuide(false);
    setPlayedIds((prev) => new Set(prev).add(next.id));
  };

  const resetDeck = () => {
    setPlayedIds(new Set());
    setCard(null);
    setShowGuide(false);
    setHasCompleted(false);
  };

  // Reset deck on mode/filter change
  useEffect(() => {
    resetDeck();
  }, [mode, selectedCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Background color: info/auto = emerald, dilemme = orange
  const backgroundColor = mode === "dilemme" ? "bg-orange-300" : "bg-emerald-300";

  // Helper: render sources (comma/semicolon separated). Supports optional label|url format.
  const renderSources = (source) => {
    if (!source) return null;
    const parts = source
      .split(/;|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    return (
      <ul className="mt-4 space-y-1 text-xs text-gray-500">
        {parts.map((s, idx) => {
          // Support "Label|https://..." or plain URL/text
          let label = s;
          let url = null;
          if (s.includes("|")) {
            const [l, u] = s.split("|").map((x) => x.trim());
            label = l || u;
            url = /^https?:\/\//i.test(u) ? u : null;
          } else if (/^https?:\/\//i.test(s)) {
            url = s;
            label = s;
          }
          return (
            <li key={idx} className="truncate">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-gray-700"
                >
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  if (!loaded) return <p className="p-10 text-center">Chargement des cartes...</p>;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${backgroundColor} text-black p-4`}>
      <h1 className="text-3xl font-bold mb-2 text-center text-emerald-800">Relations Démocratiques – Le Jeu</h1>

      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-6 text-black"
            >
              <h2 className="text-xl font-semibold mb-2">Bienvenue 👋</h2>
              <p className="text-sm text-black/80 mb-2">
                Ce jeu est une invitation à discuter et à débattre, en s’appuyant sur des résultats de recherche.
                Pioche une carte, lis l’info ou le dilemme, puis échangez : en soirée, en after, en duo ou entre proches.
              </p>
              <ul className="text-sm text-black/80 list-disc pl-5 space-y-1 mb-4">
                <li>Par défaut, les cartes alternent au hasard entre infos et dilemmes (mode Auto).</li>
                <li>Tu peux filtrer par catégories pour orienter la discussion.</li>
                <li>Chaque carte propose un guide de réponse et des sources (lien papier / épisode).</li>
              </ul>
              <div className="flex items-center justify-between">
                <a
                  href="https://rldm.fr"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-black/70 underline underline-offset-4 hover:text-black/90"
                >
                  Découvrir le podcast
                </a>
                <Button onClick={() => setShowIntro(false)}>Commencer</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap justify-center mb-3">
        <Button variant={mode === "auto" ? "default" : "outline"} onClick={() => setMode("auto")}>
          Auto
        </Button>
        <Button variant={mode === "info" ? "default" : "outline"} onClick={() => setMode("info")}>
          Carte Info
        </Button>
        <Button variant={mode === "dilemme" ? "default" : "outline"} onClick={() => setMode("dilemme")}>
          Dilemme
        </Button>
        <Button variant="ghost" onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? "Masquer les catégories" : "Afficher les catégories"}
        </Button>
      </div>

      {/* CTA podcast */}
      <a
        href="https://rldm.fr"
        target="_blank"
        rel="noreferrer"
        className="mb-2 text-xs text-black/70 underline underline-offset-4 hover:text-black/90"
      >
        Découvrir le podcast sur rldm.fr
      </a>

      {/* Category chips (collapsible) */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full max-w-3xl"
          >
            <div className="flex flex-wrap gap-2 mb-4 justify-center px-2">
              {allCategories.map((cat) => {
                const total = perCategoryTotals.get(cat) || 0;
                const played = perCategoryPlayed.get(cat) || 0;
                const label = playedIds.size > 0 ? `${cat} (${played}/${total})` : `${cat} (${total})`;
                const active = selectedCategories.includes(cat);
                return (
                  <Button
                    key={cat}
                    variant={active ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => toggleCategory(cat)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {hasCompleted ? (
        <>
          <p className="mb-3 text-sm">🎉 Tu as exploré toutes les cartes de cette sélection !</p>
          <div className="flex gap-2 mb-4">
            <Button onClick={resetDeck}>Recommencer</Button>
            <Button variant="outline" onClick={() => setSelectedCategories([])}>
              Effacer les filtres
            </Button>
          </div>
        </>
      ) : (
        <Button className="mb-4" onClick={pickCard}>
          Tirer une carte
        </Button>
      )}

      {/* Card */}
      <AnimatePresence mode="wait">
        {card && (
          <motion.div
            key={card.id + "." + playedIds.size}
            initial={{ opacity: 0, y: 60, rotate: (Math.random() - 0.5) * 6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -40, rotate: (Math.random() - 0.5) * 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            whileHover={{ scale: 1.012 }}
            whileTap={{ scale: 0.985 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(e, info) => {
              const threshold = 120;
              if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > 800) {
                setCard(null);
                setTimeout(pickCard, 120);
              }
            }}
          >
            <CardShell>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{card.category}</p>
                {card.type === "info" ? (
                  <>
                    <p className="text-lg font-semibold mb-3">{card.info}</p>
                    <p className="text-sm italic mb-2">{card.question}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mb-3">{card.situation}</p>
                    <p className="text-sm italic mb-2">{card.question}</p>
                  </>
                )}
                <Button variant="outline" className="mt-2 text-xs" onClick={() => setShowGuide(!showGuide)}>
                  {showGuide ? "Masquer le guide de réponse" : "Afficher le guide de réponse"}
                </Button>
                <AnimatePresence>
                  {showGuide && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 text-sm text-gray-700 overflow-hidden"
                    >
                      💡 {card.guide}
                    </motion.p>
                  )}
                </AnimatePresence>
                {/* Sources */}
                {renderSources(card.source)}
              </CardContent>
            </CardShell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
