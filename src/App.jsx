import { useState, useEffect } from "react";

/*
  Versione estesa: mantiene tutta la logica che avevi (timer, modal, spia, ecc.)
  e aggiunge:
   - gestione scenari: lista con Edit / Delete
   - export scenari (download JSON)
   - import scenari (upload JSON file o incolla JSON)
   - editing in-place per scenari (senza cancellare la logica esistente)
   - persist su localStorage (gia' presente) mantiene compatibilita'
*/

const STORAGE_KEY = "sf_scenarios_v1";

const defaultScenarios = [
  { name: "Ristorante", roles: ["Cameriere", "Cuoco", "Cliente", "Manager", "Spia"] },
  { name: "Aeroporto", roles: ["Pilota", "Controllore", "Passeggero", "Addetto sicurezza", "Spia"] }
];

function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScenarios;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultScenarios;
    return parsed;
  } catch (e) {
    console.warn("Impossibile leggere scenari da localStorage:", e);
    return defaultScenarios;
  }
}

function saveScenarios(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Impossibile salvare scenari su localStorage:", e);
  }
}

function App() {
  // --- stati principali (manteniamo i nomi e la logica che hai già)
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState(() => loadScenarios());
  const [roles, setRoles] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [timer, setTimer] = useState(1); // in secondi (convertito)
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  const [newScenarioName, setNewScenarioName] = useState("");
  const [newRoles, setNewRoles] = useState("");
  const [timerInput, setTimerInput] = useState(1); // in minuti

  const [roleVisible, setRoleVisible] = useState(false);
  const [allPlayersSeen, setAllPlayersSeen] = useState(false);

  // Modal control (mostra ruolo in modal separata)
  const [modalOpen, setModalOpen] = useState(false);

  // --- STATES PER IMPORT/EXPORT/EDIT
  const [editIndex, setEditIndex] = useState(null); // indice scenario in modifica (null se non in edit)
  const [importText, setImportText] = useState(""); // textarea per import manuale
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Persistiamo scenari ogni volta che cambiano
  useEffect(() => {
    saveScenarios(scenarios);
  }, [scenarios]);

  // Aggiungi giocatore (manteniamo comportamento)
  const addPlayer = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    if (!players.includes(trimmed)) setPlayers([...players, trimmed]);
  };

  // Aggiungi nuovo scenario personalizzato con spia inclusa
  const addScenario = () => {
    if (!newScenarioName || !newRoles) return;
    let rolesArray = newRoles.split(",").map(r => r.trim()).filter(r => r);
    if (!rolesArray.includes("Spia")) rolesArray.push("Spia"); // aggiungi automaticamente Spia
    const newList = [...scenarios, { name: newScenarioName, roles: rolesArray }];
    setScenarios(newList);
    setNewScenarioName("");
    setNewRoles("");
  };

  // Inizia salvataggio edit: se editIndex != null, salva le modifiche
  const saveEditedScenario = () => {
    if (editIndex === null) return;
    const rolesArray = newRoles.split(",").map(r => r.trim()).filter(r => r);
    if (rolesArray.length === 0) return;
    if (!rolesArray.includes("Spia")) rolesArray.push("Spia");
    const updated = scenarios.slice();
    updated[editIndex] = { name: newScenarioName, roles: rolesArray };
    setScenarios(updated);
    setEditIndex(null);
    setNewScenarioName("");
    setNewRoles("");
  };

  // Cancella scenario per indice
  const deleteScenario = (idx) => {
    if (!confirm(`Eliminare lo scenario "${scenarios[idx].name}"?`)) return;
    const next = scenarios.filter((_, i) => i !== idx);
    setScenarios(next);
    // se stavi modificando proprio quello, resetta edit
    if (editIndex === idx) {
      setEditIndex(null);
      setNewScenarioName("");
      setNewRoles("");
    }
    // se era selezionato come selectedScenario, deseleziona
    if (selectedScenario === scenarios[idx]) {
      setSelectedScenario(null);
    }
  };

  // Apri scenario in edit
  const editScenario = (idx) => {
    const s = scenarios[idx];
    setEditIndex(idx);
    setNewScenarioName(s.name);
    setNewRoles(s.roles.join(", "));
    // scroll or focus possibile, ma lasciamo semplice
  };

  // Esporta scenari in file JSON scaricabile
  const exportScenarios = () => {
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import da JSON (stringa), sovrascrive gli scenari caricati
  const importScenariosFromString = (jsonString, replace = true) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error("Formato JSON non valido (array atteso).");
      // validate entries: name:string, roles: array of strings
      const valid = parsed.every(item => item && typeof item.name === "string" && Array.isArray(item.roles));
      if (!valid) throw new Error("Formato elementi non valido. Ogni scenario deve avere {name, roles[]}.");
      // ensure Spia presente in each
      const fixed = parsed.map(s => {
        const rolesArray = s.roles.map(r => String(r).trim()).filter(Boolean);
        if (!rolesArray.includes("Spia")) rolesArray.push("Spia");
        return { name: String(s.name), roles: rolesArray };
      });
      if (replace) {
        setScenarios(fixed);
      } else {
        // append merging
        setScenarios(prev => {
          const merged = [...prev, ...fixed];
          return merged;
        });
      }
      alert("Importazione completata.");
      setImportModalOpen(false);
      setImportText("");
    } catch (e) {
      alert("Errore import: " + e.message);
    }
  };

  // Gestione file upload per import
  const handleImportFile = (file, replace = true) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      importScenariosFromString(text, replace);
    };
    reader.readAsText(file);
  };

  // Avvia gioco (manteniamo comportamento)
  const startGame = (random = false) => {
    if (players.length < 2) return;

    let scenario;
    if (random) {
      scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    } else {
      scenario = selectedScenario;
      if (!scenario) return;
    }
    setSelectedScenario(scenario);

    const shuffledRoles = [...scenario.roles];
    while (shuffledRoles.length < players.length) shuffledRoles.push("Spia");
    shuffledRoles.sort(() => Math.random() - 0.5);
    setRoles(shuffledRoles.slice(0, players.length));

    setCurrentPlayerIndex(0);
    setShowAllRoles(false);
    setTimer(timerInput * 60); // converti minuti in secondi
    setRoleVisible(false);
    setTimerRunning(false);
    setGameEnded(false);
    setAllPlayersSeen(false);
  };

  // Timer
  useEffect(() => {
    if (!roles.length || showAllRoles || !timerRunning) return;
    if (timer <= 0) {
      setGameEnded(true);
      setTimerRunning(false);
      return;
    }
    const interval = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(interval);
  }, [timer, roles, showAllRoles, timerRunning]);

  // helper per capire se il ruolo corrente è la spia
  const currentIsSpy = () => {
    return roles[currentPlayerIndex] && roles[currentPlayerIndex].toLowerCase() === "spia";
  };

  // next player (manteniamo comportamento: nasconde ultimo ruolo e non avvia timer automaticamente)
  const nextPlayer = () => {
    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setRoleVisible(false);
      setModalOpen(false);
    } else {
      // ultimo giocatore -> nascondi il suo ruolo e segna che tutti hanno visto
      setRoleVisible(false);
      setModalOpen(false);
      setAllPlayersSeen(true);
      // NOTA: non avviare timer automaticamente
    }
  };

  const startTimerManually = () => {
    if (!roles.length || timerRunning || gameEnded) return;
    setTimerRunning(true);
  };

  const resetGame = () => {
    setPlayers([]);
    setRoles([]);
    setSelectedScenario(null);
    setCurrentPlayerIndex(0);
    setShowAllRoles(false);
    setRoleVisible(false);
    setTimer(timerInput * 60);
    setTimerRunning(false);
    setGameEnded(false);
    setAllPlayersSeen(false);
    setModalOpen(false);
  };

  // UI helpers
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // Apertura "mostra ruolo" in modal (anziché render inline) — migliora privacy al passaggio device
  const openRoleModal = () => {
    setRoleVisible(true);
    setModalOpen(true);
  };

  return (
    <div className="sf-root" style={{ fontFamily: "sans-serif", padding: 18 }}>
      <div className="sf-container" style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 style={{ margin: 0 }}>Spyfall — Prototype</h1>
          <div style={{ fontSize: 13, color: "#555" }}>Passa il dispositivo per mostrare il ruolo</div>
        </header>

        {/* SETUP */}
        {!roles.length && (
          <section className="setup" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18, alignItems: "start" }}>
            <div className="left">
              <div style={{ marginBottom: 8 }}>
                <h2 style={{ margin: "6px 0" }}>Giocatori</h2>
                <input
                  aria-label="Nome giocatore"
                  className="input"
                  type="text"
                  placeholder="Nome giocatore e premi Invio"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addPlayer(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  style={{ padding: 10, width: "100%", boxSizing: "border-box", fontSize: 14 }}
                />
                <ul style={{ marginTop: 8 }}>
                  {players.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>

              <div style={{ marginTop: 10 }}>
                <h2 style={{ margin: "6px 0" }}>Scenario</h2>
                <select
                  aria-label="Seleziona scenario"
                  value={scenarios.indexOf(selectedScenario)}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedScenario(scenarios[idx]);
                  }}
                  style={{ padding: 10, width: "100%", fontSize: 14 }}
                >
                  <option value={-1}>Seleziona scenario</option>
                  {scenarios.map((s, i) => (
                    <option key={i} value={i}>{s.name} — {s.roles.length} ruoli</option>
                  ))}
                </select>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button className="btn primary" onClick={() => startGame(false)} disabled={!selectedScenario || players.length < 2}>Inizia (Scenario scelto)</button>
                  <button className="btn" onClick={() => startGame(true)} disabled={players.length < 2}>Inizia (Casuale)</button>
                </div>
              </div>
            </div>

            <aside className="right" style={{ borderLeft: "1px solid #eee", paddingLeft: 14 }}>
              <div>
                <h3 style={{ margin: "6px 0" }}>Timer (minuti)</h3>
                <input
                  type="number"
                  min={1}
                  value={timerInput}
                  onChange={(e) => setTimerInput(Number(e.target.value))}
                  style={{ padding: 8, width: "100%", fontSize: 14 }}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <h3 style={{ margin: "6px 0" }}>Crea nuovo scenario</h3>

                {/* Se sei in edit, cambia testo dei campi */}
                <input
                  type="text"
                  placeholder="Nome scenario"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  style={{ padding: 8, width: "100%", fontSize: 14, marginBottom: 8 }}
                />
                <input
                  type="text"
                  placeholder="Ruoli separati da virgola"
                  value={newRoles}
                  onChange={(e) => setNewRoles(e.target.value)}
                  style={{ padding: 8, width: "100%", fontSize: 14, marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  {editIndex === null ? (
                    <button className="btn" onClick={addScenario}>Aggiungi Scenario</button>
                  ) : (
                    <button className="btn" onClick={saveEditedScenario}>Salva Modifica</button>
                  )}
                  <button className="btn" onClick={() => { setScenarios(defaultScenarios); }}>Ripristina default</button>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
                  Gli scenari creati vengono salvati automaticamente nel browser.
                </div>

                {/* --- gestione scenari: lista con edit/delete --- */}
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ margin: "8px 0" }}>Scenari salvati ({scenarios.length})</h4>
                  <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                    {scenarios.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 14 }}>
                          <strong>{s.name}</strong> <span style={{ color: "#666", fontSize: 12 }}>({s.roles.length})</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn" onClick={() => editScenario(i)}>Modifica</button>
                          <button className="btn secondary" onClick={() => deleteScenario(i)}>Elimina</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button className="btn" onClick={exportScenarios}>Esporta JSON</button>
                    <button className="btn" onClick={() => setImportModalOpen(true)}>Importa JSON</button>
                    <label style={{ display: "inline-block", padding: 6, borderRadius: 8, border: "1px dashed #ccc", cursor: "pointer" }}>
                      Carica file
                      <input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleImportFile(f, false); // append by default
                        e.target.value = null;
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* IMPORT MODAL */}
        {importModalOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <h4>Importa scenari (JSON)</h4>
              <p style={{ fontSize: 13, color: "#555" }}>Incolla qui il contenuto JSON degli scenari o carica un file. Puoi scegliere di sostituire o aggiungere.</p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} style={{ width: "100%", minHeight: 140, padding: 8 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn" onClick={() => importScenariosFromString(importText, true)}>Importa e sostituisci</button>
                <button className="btn" onClick={() => importScenariosFromString(importText, false)}>Importa e aggiungi</button>
                <button className="btn secondary" onClick={() => setImportModalOpen(false)}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* GAME */}
        {roles.length > 0 && !showAllRoles && (
          <section style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: "6px 0" }}>Gioco in corso</h2>
                <div style={{ color: "#666" }}>Scenario: <strong>{selectedScenario?.name}</strong></div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className={`timer ${timerRunning ? "running" : ""} ${timer <= 30 ? "warn" : ""}`} style={{ fontFamily: "monospace", fontSize: 18 }}>
                  {formatTime(timer)}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {timerRunning ? "Timer in corso" : allPlayersSeen ? "Pronto per avviare" : "Timer partirà dopo l'ultimo"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, borderTop: "1px dashed #eee", paddingTop: 12 }}>
              <h3 style={{ margin: "6px 0" }}>Ruolo per <span style={{ color: "#222" }}>{players[currentPlayerIndex]}</span></h3>

              {/* pulsante per aprire la modal (Mostra Ruolo) */}
              {!allPlayersSeen && !roleVisible && (
                <div style={{ marginBottom: 10 }}>
                  <button className="btn large primary" onClick={openRoleModal}>Mostra Ruolo</button>
                </div>
              )}

              {/* Modal visuale (mostra ruolo) */}
              {modalOpen && (
                <div className="modal-backdrop" onClick={() => { /* click fuori non chiude per sicurezza */ }}>
                  <div className="modal">
                    <h4 style={{ marginTop: 0 }}>Il tuo ruolo</h4>
                    <div style={{ fontSize: 20, fontWeight: 700, margin: "8px 0" }}>{roles[currentPlayerIndex]}</div>

                    {!currentIsSpy() ? (
                      <>
                        <h5 style={{ marginBottom: 6 }}>Riepilogo ruoli (anonimo)</h5>
                        <ul style={{ textAlign: "left" }}>
                          {roles.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </>
                    ) : (
                      <div style={{ fontStyle: "italic", color: "#444" }}>Sei la SPia — gli altri ruoli non ti vengono mostrati.</div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn" onClick={() => { setModalOpen(false); setRoleVisible(true); }}>Ho visto il ruolo</button>
                      <button className="btn secondary" onClick={() => { setModalOpen(false); }}>Chiudi</button>
                    </div>
                  </div>
                </div>
              )}

              {/* se roleVisible è true (il giocatore ha confermato di aver visto), mostriamo una nota e il bottone Prossimo */}
              {roleVisible && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8 }}>Ruolo visualizzato in privato. Premi <strong>Prossimo giocatore</strong> quando passi il dispositivo.</div>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={nextPlayer} disabled={allPlayersSeen && !timerRunning}>Prossimo giocatore</button>
              </div>

              {allPlayersSeen && !timerRunning && !gameEnded && (
                <div style={{ marginTop: 12 }}>
                  <p>Tutti i giocatori hanno letto il proprio ruolo.</p>
                  <button className="btn primary" onClick={startTimerManually}>Avvia Timer</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FINE PARTITA */}
        {gameEnded && (
          <section style={{ marginTop: 16 }}>
            <h2>Tempo scaduto!</h2>
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={resetGame}>Torna alla pagina iniziale</button>
            </div>
          </section>
        )}

      </div>

      {/* small footer */}
      <footer style={{ marginTop: 18, textAlign: "center", color: "#777", fontSize: 13 }}>
        Versione prototipo — saved scenarios: <strong>{scenarios.length}</strong>
      </footer>
    </div>
  );
}

export default App;
