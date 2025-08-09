import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

function Card({ children }) {
  return (
    <div className="relative">
      <div className="relative max-w-md bg-white text-black rounded-2xl shadow-xl p-6">
        {children}
      </div>
    </div>
  );
}

function CardContent({ children }) {
  return <div>{children}</div>;
}

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

export default function App() {
  const [mode, setMode] = useState("info"); // "info" | "dilemme"
  const [cards, setCards] = useState({ info: [], dilemme: [] });
  const [allCategories, setAllCategories] = useState([]); // unique list from CSV
  const [selectedCategories, setSelectedCategories] = useState([]); // multi-select
  const [showFilters, setShowFilters] = useState(false); // hide/show chip list

  const [card, setCard] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [playedIds, setPlayedIds] = useState(new Set());
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load CSV
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
            if (!row.type) return; // skip empty lines
            const base = {
              id: `${row.type}-${i}`,
              category: row.category?.trim() || "Autre",
              question: row.question || "",
              guide: row.guide || "",
              source: row.source || "",
            };
            if (row.type === "info") {
              info.push({ ...base, info: row["info / situation"] || "" });
            } else if (row.type === "dilemme") {
              dilemme.push({ ...base, situation: row["info / situation"] || "" });
            }
          });
          setCards({ info, dilemme });
          // unique categories from both decks
          const cats = Array.from(
            new Set([...info, ...dilemme].map((c) => c.category).filter(Boolean))
          ).sort();
          setAllCategories(cats);
          setLoaded(true);
        },
      });
    };
    fetchData();
  }, []);

  // Filtered pool by mode + selected categories
  const pool = useMemo(() => {
    const list = cards[mode] || [];
    return selectedCategories.length === 0
      ? list
      : list.filter((c) => selectedCategories.includes(c.category));
  }, [cards, mode, selectedCategories]);

  // Per-category totals and played counts (for current mode)
  const perCategoryTotals = useMemo(() => {
    const counts = new Map();
    (cards[mode] || []).forEach((c) => {
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts; // Map(category -> total)
  }, [cards, mode]);

  const perCategoryPlayed = useMemo(() => {
    const counts = new Map();
    (cards[mode] || []).forEach((c) => {
      if (playedIds.has(c.id)) {
        counts.set(c.category, (counts.get(c.category) || 0) + 1);
      }
    });
    return counts; // Map(category -> played)
  }, [cards, mode, playedIds]);

  const pickCard = () => {
    // available = pool minus played
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

  useEffect(() => {
    // Any change of mode or filters resets the local session deck
    resetDeck();
  }, [mode, selectedCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const backgroundColor = mode === "info" ? "bg-emerald-300" : "bg-orange-300";

  if (!loaded)
    return <p className="p-10 text-center">Chargement des cartes...</p>;

  // Helper: render sources (split by ; or ,) with links if URL-looking
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
          const isUrl = /^https?:\/\//i.test(s);
          return (
            <li key={idx} className="truncate">
              {isUrl ? (
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-gray-700"
                >
                  {s}
                </a>
              ) : (
                <span>{s}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${backgroundColor} text-black p-4`}
    >
      <h1 className="text-3xl font-bold mb-2 text-center text-emerald-800">
        Relations Démocratiques – Le Jeu
      </h1>

      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap justify-center mb-3">
        <Button
          variant={mode === "info" ? "default" : "outline"}
          onClick={() => setMode("info")}
        >
          Carte Info
        </Button>
        <Button
          variant={mode === "dilemme" ? "default" : "outline"}
          onClick={() => setMode("dilemme")}
        >
          Dilemme
        </Button>
        <Button variant="ghost" onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? "Masquer les catégories" : "Afficher les catégories"}
        </Button>
      </div>

      {/* Categories (optional, collapsible) */}
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
              if (
                Math.abs(info.offset.x) > threshold ||
                Math.abs(info.velocity.x) > 800
              ) {
                setCard(null);
                setTimeout(pickCard, 120);
              }
            }}
          >
            <Card>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {card.category}
                </p>
                {mode === "info" ? (
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
                <Button
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => setShowGuide(!showGuide)}
                >
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
