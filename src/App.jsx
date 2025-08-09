import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

function Card({ children }) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${backgroundColor} text-black p-4`}
    >
      <h1 className="text-3xl font-bold mb-2 text-center text-emerald-800">
        Relations Démocratiques – Le Jeu
      </h1>

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
                Ce jeu est une invitation à discuter et à débattre, en s’appuyant sur des résultats
                de recherche. Pioche une carte, lis l’info ou le dilemme, puis échangez : en soirée,
                en after, en duo ou entre proches.
              </p>
              <ul className="text-sm text-black/80 list-disc pl-5 space-y-1 mb-4">
                <li>Par défaut, les cartes alternent au hasard entre infos et dilemmes.</li>
                <li>Tu peux filtrer par catégories pour orienter la discussion.</li>
                <li>Chaque carte a un guide de réponse et des sources en bas.</li>
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
        <Button
          variant={mode === "auto" ? "default" : "outline"}
          onClick={() => setMode("auto")}
        >
          Auto
        </Button>
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

      {/* CTA podcast */}
      <a
        href="https://rldm.fr"
        target="_blank"
        rel="noreferrer"
        className="mb-2 text-xs text-black/70 underline underline-offset-4 hover:text-black/90"
      >
        Découvrir le podcast sur rldm.fr
      </a>

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
