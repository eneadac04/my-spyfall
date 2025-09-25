import { useState, useEffect } from "react";

const defaultScenarios = [
  { name: "Ristorante", roles: ["Cameriere", "Cuoco", "Cliente", "Manager", "Spia"] },
  { name: "Aeroporto", roles: ["Pilota", "Controllore", "Passeggero", "Addetto sicurezza", "Spia"] }
];

function App() {
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState(defaultScenarios);
  const [roles, setRoles] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [timer, setTimer] = useState(1); // Timer in minuti (convertito in secondi alla partenza)
  const [timerRunning, setTimerRunning] = useState(false); // il timer parte solo quando viene avviato manualmente
  const [gameEnded, setGameEnded] = useState(false);

  const [newScenarioName, setNewScenarioName] = useState("");
  const [newRoles, setNewRoles] = useState("");
  const [timerInput, setTimerInput] = useState(1); // Timer regolabile in minuti

  const [roleVisible, setRoleVisible] = useState(false); // per pulsante "Mostra"
  const [allPlayersSeen, setAllPlayersSeen] = useState(false); // indica che tutti hanno letto il ruolo (ma timer non parte finché non premi Avvia)

  // Aggiungi giocatore
  const addPlayer = (name) => {
    if (name && !players.includes(name)) setPlayers([...players, name]);
  };

  // Aggiungi nuovo scenario personalizzato con spia inclusa
  const addScenario = () => {
    if (!newScenarioName || !newRoles) return;
    let rolesArray = newRoles.split(",").map(r => r.trim()).filter(r => r);
    if (!rolesArray.includes("Spia")) rolesArray.push("Spia"); // aggiungi automaticamente Spia
    setScenarios([...scenarios, { name: newScenarioName, roles: rolesArray }]);
    setNewScenarioName("");
    setNewRoles("");
  };

  // Avvia gioco
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
    setTimer(timerInput * 60); // converti minuti in secondi per il countdown
    setRoleVisible(false);
    setTimerRunning(false); // timer non parte subito
    setGameEnded(false);
    setAllPlayersSeen(false); // reset flag: nessuno ha ancora visto
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

  // Prossimo giocatore:
  // - se ci sono ancora giocatori, vai al successivo e nascondi il ruolo
  // - se era l'ultimo, NON lasciare il ruolo visibile e imposta allPlayersSeen(true)
  //   ma NON avviare il timer: compare il bottone "Avvia Timer"
  const nextPlayer = () => {
    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setRoleVisible(false);
    } else {
      // ultimo giocatore -> nascondi il suo ruolo e segna che tutti hanno visto
      setRoleVisible(false);        // importantissimo: non lasciare il ruolo dell'ultimo visibile
      setAllPlayersSeen(true);      // ora tutti hanno letto il loro ruolo
      // NOTA: non avviare il timer automaticamente: aspettiamo che qualcuno prema "Avvia Timer"
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
  };

  // helper per capire se il ruolo corrente è la spia
  const currentIsSpy = () => {
    return roles[currentPlayerIndex] && roles[currentPlayerIndex].toLowerCase() === "spia";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Spyfall Prototype</h1>

      {/* schermata di setup (giocatori, timer, scenario, creazione scenario) */}
      {!roles.length && (
        <>
          <h2>Giocatori</h2>
          <input
            type="text"
            placeholder="Nome giocatore"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addPlayer(e.target.value);
                e.target.value = "";
              }
            }}
          />
          <ul>{players.map((p, i) => <li key={i}>{p}</li>)}</ul>

          <h2>Timer (minuti)</h2>
          <input
            type="number"
            value={timerInput}
            onChange={(e) => setTimerInput(Number(e.target.value))}
          />

          <h2>Scenario</h2>
          <select onChange={(e) => setSelectedScenario(scenarios[e.target.value])}>
            <option value="">Seleziona scenario</option>
            {scenarios.map((s, i) => (
              <option key={i} value={i}>{s.name}</option>
            ))}
          </select>
          <div style={{ margin: "5px 0" }}>
            <button onClick={() => startGame(false)} disabled={!selectedScenario || players.length < 2}>
              Inizia Gioco con Scenario Scelto
            </button>
            <button onClick={() => startGame(true)} disabled={players.length < 2}>
              Inizia Gioco con Scenario Casuale
            </button>
          </div>

          <h2>Crea nuovo scenario</h2>
          <input
            type="text"
            placeholder="Nome scenario"
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Ruoli separati da virgola"
            value={newRoles}
            onChange={(e) => setNewRoles(e.target.value)}
          />
          <button onClick={addScenario}>Aggiungi Scenario</button>
        </>
      )}

      {/* fase di rivelazione ruoli e passaggio device */}
      {roles.length > 0 && !showAllRoles && (
        <div>
          <h2>Gioco in corso...</h2>
          <p>Scenario: {selectedScenario?.name}</p>

          {/* mostra timer sempre a schermo (minuti:secondi) */}
          <p>
            Tempo rimanente:{" "}
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            {timerRunning ? " (in corso)" : allPlayersSeen ? " (pronto per avviare)" : " (parte dopo che l'ultimo ha visto il ruolo e premi Avvia Timer)"}
          </p>

          <h3>Ruolo per {players[currentPlayerIndex]}</h3>

          {/* Mostra Ruolo solo se: non siamo nella fase finale 'allPlayersSeen' OR
              siamo prima dell'ultimo giocatore. In pratica quando allPlayersSeen==true
              non deve apparire il bottone per evitare reveal accidentali */}
          { !allPlayersSeen && !roleVisible && (
            <button onClick={() => setRoleVisible(true)}>Mostra Ruolo</button>
          )}

          {/* quando visibile, mostra il ruolo. Se è la spia, NON mostra il riepilogo anonimo */}
          {roleVisible && (
            <div>
              <p style={{ fontWeight: "700" }}>{roles[currentPlayerIndex]}</p>

              {/* se NON è la spia, mostra il riepilogo anonimo; se è la spia, non mostrare i ruoli degli altri */}
              {!currentIsSpy() ? (
                <>
                  <h4>Riepilogo ruoli (anonimi)</h4>
                  <ul>
                    {roles.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div>
                  <p style={{ fontStyle: "italic" }}>
                    Sei la SPia — non ti vengono mostrati gli altri ruoli.
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button onClick={nextPlayer} disabled={allPlayersSeen && !timerRunning}>
              Prossimo giocatore
            </button>
          </div>

          {/* Se tutti hanno visto i ruoli, mostra il pulsante per avviare il timer */}
          {allPlayersSeen && !timerRunning && !gameEnded && (
            <div style={{ marginTop: 12 }}>
              <p>Tutti i giocatori hanno letto il proprio ruolo.</p>
              <button onClick={startTimerManually}>Avvia Timer</button>
            </div>
          )}
        </div>
      )}

      {/* schermata finale quando il timer è scaduto */}
      {gameEnded && (
        <div>
          <h2>Tempo scaduto!</h2>
          <button onClick={resetGame}>Torna alla pagina iniziale</button>
        </div>
      )}
    </div>
  );
}

export default App;
