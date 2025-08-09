import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";

const categories = [
  "Équilibre des rôles",
  "Accepter ses envies",
  "Communication et écoute",
  "Reconnaissance et attachement",
  "Consentement et limites",
  "Diversité des modèles",
  "Sexualité et santé",
  "Temporalités relationnelles"
];

function Card({ children }) {
  return <div className="max-w-md bg-white text-black rounded-2xl shadow-xl p-6">{children}</div>;
}

function CardContent({ children }) {
  return <div>{children}</div>;
}

function Button({ children, onClick, variant = "default", className = "" }) {
  const base = "px-4 py-2 rounded font-semibold transition";
  const styles =
    variant === "default"
      ? "bg-emerald-500 text-white hover:bg-emerald-600"
      : variant === "outline"
      ? "border border-black text-black hover:bg-gray-100"
      : "";
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState("info");
  const [cards, setCards] = useState({ info: [], dilemme: [] });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [card, setCard] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [usedIndices, setUsedIndices] = useState([]);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7zxUp9lhRfav7Ax-IEVnsIGP_z6O5AxisPe7y0rj4r5FEKfGCgqKp3L7xXsSJc7Xl6rB35MdzlT_r/pub?gid=0&single=true&output=csv";
      const response = await fetch(url);
      const text = await response.text();
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          const info = [];
          const dilemme = [];
          results.data.forEach((row) => {
            const entry = {
              category: row.category,
              question: row.question,
              guide: row.guide,
            };
            if (row.type === "info") {
              entry.info = row["info / situation"];
              info.push(entry);
            } else if (row.type === "dilemme") {
              entry.situation = row["info / situation"];
              dilemme.push(entry);
            }
          });
          setCards({ info, dilemme });
          setLoaded(true);
        }
      });
    };
    fetchData();
  }, []);

  const filteredCards = cards[mode].filter(c =>
    selectedCategories.length === 0 || selectedCategories.includes(c.category)
  );

  const pickCard = () => {
    if (usedIndices.length === filteredCards.length) {
      setHasCompleted(true);
      return;
    }
    let index;
    do {
      index = Math.floor(Math.random() * filteredCards.length);
    } while (usedIndices.includes(index));
    setUsedIndices([...usedIndices, index]);
    setCard(filteredCards[index]);
    setShowGuide(false);
  };

  const resetDeck = () => {
    setUsedIndices([]);
    setCard(null);
    setShowGuide(false);
    setHasCompleted(false);
  };

  useEffect(() => {
    resetDeck();
  }, [mode, selectedCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const backgroundColor = mode === "info" ? "bg-emerald-300" : "bg-orange-300";

  if (!loaded) return <p className="p-10 text-center">Chargement des cartes...</p>;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${backgroundColor} text-black p-4`}>
      <h1 className="text-3xl font-bold mb-4 text-center text-emerald-800">Relations Démocratiques – Le Jeu</h1>

      <div className="flex gap-4 flex-wrap justify-center mb-4">
        <Button variant={mode === "info" ? "default" : "outline"} onClick={() => setMode("info")}>Carte Info</Button>
        <Button variant={mode === "dilemme" ? "default" : "outline"} onClick={() => setMode("dilemme")}>Dilemme</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategories.includes(cat) ? "default" : "outline"}
            className="text-sm"
            onClick={() => toggleCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {hasCompleted ? (
        <>
          <p className="mb-4">🎉 Tu as exploré toutes les cartes de cette sélection !</p>
          <Button className="mb-6" onClick={resetDeck}>Recommencer</Button>
        </>
      ) : (
        <Button className="mb-6" onClick={pickCard}>Tirer une carte</Button>
      )}

      {card && (
        <motion.div
          key={JSON.stringify(card)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardContent>
              <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">{card.category}</p>
              {mode === "info" ? (
                <>
                  <p className="text-lg font-semibold mb-4">{card.info}</p>
                  <p className="text-md italic mb-2">{card.question}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold mb-4">{card.situation}</p>
                  <p className="text-md italic mb-2">{card.question}</p>
                </>
              )}
              <Button
                variant="outline"
                className="mt-2 text-sm"
                onClick={() => setShowGuide(!showGuide)}
              >
                {showGuide ? "Masquer le guide de réponse" : "Afficher le guide de réponse"}
              </Button>
              {showGuide && (
                <p className="mt-4 text-sm text-gray-700">💡 {card.guide}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
