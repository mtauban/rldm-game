import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * UI primitives
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

/** Markdown renderer (GFM) */
function MD({ children, className = "" }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className={`underline underline-offset-2 hover:opacity-90 ${props.className || ""}`}
            />
          ),
          ul: ({ node, ...props }) => <ul className={`list-disc pl-5 ${props.className || ""}`} {...props} />,
          ol: ({ node, ...props }) => <ol className={`list-decimal pl-5 ${props.className || ""}`} {...props} />,
        }}
      >
        {String(children ?? "")}
      </ReactMarkdown>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("auto");
  const [cards, setCards] = useState({ info: [], dilemme: [] });
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [card, setCard] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [playedIds, setPlayedIds] = useState(new Set());
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
            if (!type) return;
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

  const effective = useMemo(() => {
    if (mode === "auto") return [...(cards.info || []), ...(cards.dilemme || [])];
    return cards[mode] || [];
  }, [cards, mode]);

  const pool = useMemo(() => {
    return selectedCategories.length === 0
      ? effective
      : effective.filter((c) => selectedCategories.includes(c.category));
  }, [effective, selectedCategories]);

  const perCategoryTotals = useMemo(() => {
    const counts = new Map();
    (effective || []).forEach((c) => {
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts;
  }, [effective]);

  const perCategoryPlayed = useMemo(() => {
    const counts = new Map();
    (effective || []).forEach((c) => {
      if (playedIds.has(c.id)) counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return counts;
  }, [effective, playedIds]);

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

  useEffect(() => {
    resetDeck();
  }, [mode, selectedCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const backgroundColor = mode === "dilemme" ? "bg-orange-300" : "bg-emerald-300";

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
                <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-gray-700">
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
              </p>
              <Button onClick={() => setShowIntro(false)}>Commencer</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {showFilters ? "Masquer catégories" : "Afficher catégories"}
        </Button>
      </div>

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

      {hasCompleted ? (
        <>
          <p className="mb-3 text-sm">🎉 Toutes les cartes jouées !</p>
          <Button onClick={resetDeck}>Recommencer</Button>
        </>
      ) : (
        <Button className="mb-4" onClick={pickCard}>
          Tirer une carte
        </Button>
      )}

      <AnimatePresence mode="wait">
        {card && (
          <motion.div
            key={card.id + "." + playedIds.size}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <CardShell>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{String(card.category || "")}</p>

                {card.type === "info" ? (
                  <>
                    <MD className="text-base leading-relaxed mb-3">{String(card.info || "")}</MD>
                    <MD className="text-sm leading-relaxed mb-2">{String(card.question || "")}</MD>
                  </>
                ) : (
                  <>
                    <MD className="text-base leading-relaxed mb-3">{String(card.situation || "")}</MD>
                    <MD className="text-sm leading-relaxed mb-2">{String(card.question || "")}</MD>
                  </>
                )}

                <Button variant="outline" className="mt-2 text-xs" onClick={() => setShowGuide(!showGuide)}>
                  {showGuide ? "Masquer le guide" : "Afficher le guide"}
                </Button>

                <AnimatePresence>
                  {showGuide && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 overflow-hidden"
                    >
                      <MD className="text-sm text-gray-700">{`💡 ${String(card.guide || "")}`}</MD>
                    </motion.div>
                  )}
                </AnimatePresence>

                {renderSources(card.source)}
              </CardContent>
            </CardShell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
