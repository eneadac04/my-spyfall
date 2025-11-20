import { useState, useEffect } from "react";
import './App.css';

/*
  SPYFALL - VERSIONE DEFINITIVA (Safe Mode)
  - Aggiunto: Modal di conferma per il Reset degli Scenari (Protezione dati)
  - Tutte le funzionalità precedenti incluse (Menu, Dark Theme, Strict Logic)
*/

const STORAGE_KEY = "sf_scenarios_v1";

const defaultScenarios = [
  { name: "Ristorante", roles: ["Cameriere", "Cuoco", "Cliente", "Manager", "Lavapiatti", "Critico culinario", "Sommelier"] },
  { name: "Aeroporto", roles: ["Pilota", "Controllore", "Passeggero", "Addetto sicurezza", "Hostess", "Addetto bagagli", "Poliziotto"] },
  { name: "Ospedale", roles: ["Chirurgo", "Infermiere", "Paziente", "Direttore", "Addetto pulizie", "Anestesista", "Tirocinante"] }
];

function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScenarios;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultScenarios;
    return parsed;
  } catch (e) {
    console.warn("Impossibile leggere scenari:", e);
    return defaultScenarios;
  }
}

function saveScenarios(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) { console.warn(e); }
}

function App() {
  // Stati Dati
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState(() => loadScenarios());
  const [roles, setRoles] = useState([]);
  
  // Stati Navigazione
  const [currentView, setCurrentView] = useState("menu");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  
  // Stati Gioco
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [timer, setTimer] = useState(1);
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [roleVisible, setRoleVisible] = useState(false);
  const [allPlayersSeen, setAllPlayersSeen] = useState(false);

  // Stati Inputs
  const [spyCount, setSpyCount] = useState(1);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newRoles, setNewRoles] = useState("");
  const [timerInput, setTimerInput] = useState(5);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false); // <--- NUOVO STATO PER RESET
  
  // Import/Export/Edit
  const [editIndex, setEditIndex] = useState(null);
  const [importText, setImportText] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => { saveScenarios(scenarios); }, [scenarios]);

  // GESTIONE GIOCATORI
  const addPlayer = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    if (!players.includes(trimmed)) setPlayers([...players, trimmed]);
  };

  const removePlayer = (index) => {
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
  };

  // GESTIONE SCENARI
  const addScenario = () => {
    if (!newScenarioName || !newRoles) return;
    let rolesArray = newRoles.split(",").map(r => r.trim()).filter(r => r);
    rolesArray = rolesArray.filter(r => r.toLowerCase() !== "spia");
    const newList = [...scenarios, { name: newScenarioName, roles: rolesArray }];
    setScenarios(newList);
    setNewScenarioName("");
    setNewRoles("");
  };

  const saveEditedScenario = () => {
    if (editIndex === null) return;
    let rolesArray = newRoles.split(",").map(r => r.trim()).filter(r => r);
    rolesArray = rolesArray.filter(r => r.toLowerCase() !== "spia");
    if (rolesArray.length === 0) return;
    const updated = scenarios.slice();
    updated[editIndex] = { name: newScenarioName, roles: rolesArray };
    setScenarios(updated);
    setEditIndex(null);
    setNewScenarioName("");
    setNewRoles("");
  };

  const deleteScenario = (idx) => {
    if (!confirm(`Eliminare "${scenarios[idx].name}"?`)) return;
    const next = scenarios.filter((_, i) => i !== idx);
    setScenarios(next);
    if (editIndex === idx) { setEditIndex(null); setNewScenarioName(""); setNewRoles(""); }
    if (selectedScenario === scenarios[idx]) setSelectedScenario(null);
  };

  const editScenario = (idx) => {
    const s = scenarios[idx];
    setEditIndex(idx);
    setNewScenarioName(s.name);
    setNewRoles(s.roles.join(", "));
  };

  // NUOVA FUNZIONE DI RESET SICURO
  const confirmResetScenarios = () => {
    setScenarios(defaultScenarios);
    setShowResetModal(false);
  };

  // Import/Export
  const exportScenarios = () => {
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScenariosFromString = (jsonString, replace = true) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error("JSON invalido");
      const fixed = parsed.map(s => {
        const rolesArray = s.roles.map(r => String(r).trim()).filter(Boolean);
        const cleanRoles = rolesArray.filter(r => r.toLowerCase() !== "spia");
        return { name: String(s.name), roles: cleanRoles };
      });
      if (replace) setScenarios(fixed);
      else setScenarios(prev => [...prev, ...fixed]);
      setImportModalOpen(false);
      setImportText("");
    } catch (e) { alert("Errore import: " + e.message); }
  };

  const handleImportFile = (file, replace = true) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => importScenariosFromString(ev.target.result, replace);
    reader.readAsText(file);
  };

  // LOGICA GIOCO
  const startGame = (random = false) => {
    if (players.length < 2) return;
    let scenario;
    if (random) scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    else {
      scenario = selectedScenario;
      if (!scenario) return;
    }
    setSelectedScenario(scenario);

    const baseRoles = scenario.roles.filter(r => r.toLowerCase() !== "spia");
    let actualSpyCount = spyCount;
    if (actualSpyCount >= players.length) actualSpyCount = players.length - 1;
    if (actualSpyCount < 1) actualSpyCount = 1;

    const neededInnocents = players.length - actualSpyCount;
    
    if (neededInnocents > baseRoles.length) {
        alert(`Errore: troppi giocatori! Servono ${neededInnocents} ruoli innocenti, ma "${scenario.name}" ne ha solo ${baseRoles.length}.`);
        setSelectedScenario(null);
        return;
    }

    const shuffledBase = [...baseRoles].sort(() => Math.random() - 0.5);
    const finalRoles = shuffledBase.slice(0, neededInnocents);
    for (let i = 0; i < actualSpyCount; i++) finalRoles.push("Spia");
    finalRoles.sort(() => Math.random() - 0.5);
    
    setRoles(finalRoles);
    setCurrentPlayerIndex(0);
    setShowAllRoles(false);
    setTimer(timerInput * 60);
    setRoleVisible(false);
    setTimerRunning(false);
    setGameEnded(false);
    setAllPlayersSeen(false);
  };

  useEffect(() => {
    if (!roles.length || showAllRoles || !timerRunning) return;
    if (timer <= 0) { setGameEnded(true); setTimerRunning(false); return; }
    const interval = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(interval);
  }, [timer, roles, showAllRoles, timerRunning]);

  const currentIsSpy = () => roles[currentPlayerIndex] && roles[currentPlayerIndex].toLowerCase() === "spia";
  
  const nextPlayer = () => {
    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setRoleVisible(false);
      setModalOpen(false);
    } else {
      setRoleVisible(false);
      setModalOpen(false);
      setAllPlayersSeen(true);
    }
  };

  const startTimerManually = () => { if (!roles.length || timerRunning || gameEnded) return; setTimerRunning(true); };
  const confirmEndGame = () => { setGameEnded(true); setTimerRunning(false); setShowEndGameModal(false); };
  
  const resetGame = () => {
    setPlayers([]); setRoles([]); setSelectedScenario(null); setCurrentPlayerIndex(0);
    setShowAllRoles(false); setRoleVisible(false); setTimer(timerInput * 60);
    setTimerRunning(false); setGameEnded(false); setAllPlayersSeen(false);
    setModalOpen(false); setShowEndGameModal(false);
    setCurrentView("menu");
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="sf-root">
      <div className="sf-container">
        
        <header>
          <h1 style={{ letterSpacing: '3px', color: 'var(--primary)' }}>MOLE HUNT</h1>
          <div className="subtitle">Caccia alla Talpa</div>
        </header>

        {/* --- MENU E SETUP --- */}
        {!roles.length && (
          <div style={{ width: '100%' }}>
            
            {/* MENU PRINCIPALE */}
            {currentView === "menu" && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: 30 }}>Menu Principale</h2>
                <button className="btn primary large" style={{ width: '100%', marginBottom: 20 }} onClick={() => setCurrentView("play")}>
                  🎮 NUOVA PARTITA
                </button>
                <button className="btn accent" style={{ width: '100%' }} onClick={() => setCurrentView("editor")}>
                  📝 EDITOR SCENARI
                </button>
              </div>
            )}

            {/* PLAY MODE */}
            {currentView === "play" && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => setCurrentView("menu")}>⬅ Torna al Menu</button>
                </div>

                <div className="card" style={{ marginBottom: 20 }}>
                  <h2>1. Giocatori ({players.length})</h2>
                  <div className="input-group">
                    <input
                      className="input"
                      type="text"
                      placeholder="Scrivi nome e premi Invio..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { addPlayer(e.target.value); e.target.value = ""; }
                      }}
                    />
                  </div>
                  <ul className="player-list">
                    {players.map((p, i) => (
                      <li key={i} className="list-item">
                        {p} <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => removePlayer(i)}>✕</span>
                      </li>
                    ))}
                    {!players.length && <li className="text-small">Nessun giocatore aggiunto.</li>}
                  </ul>
                </div>

                <div className="card">
                  <h2>2. Impostazioni</h2>
                  <div className="input-group">
                    <label>Scenario</label>
                    <select value={scenarios.indexOf(selectedScenario)} onChange={(e) => setSelectedScenario(scenarios[Number(e.target.value)])}>
                      <option value={-1}>Scegli Scenario...</option>
                      {scenarios.map((s, i) => <option key={i} value={i}>{s.name} ({s.roles.length} ruoli)</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label>Timer (min)</label>
                      <input type="number" min={0} value={timerInput} onChange={(e) => setTimerInput(Number(e.target.value))} />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label>N. Spie</label>
                      <input type="number" min={1} max={players.length > 1 ? players.length - 1 : 5} value={spyCount} onChange={(e) => setSpyCount(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="btn-group">
                    <button className="btn primary" onClick={() => startGame(false)} disabled={!selectedScenario || players.length < 2}>AVVIA GIOCO</button>
                    <button className="btn accent" onClick={() => startGame(true)} disabled={players.length < 2}>AVVIA RANDOM</button>
                  </div>
                </div>
              </>
            )}

            {/* EDITOR MODE */}
            {currentView === "editor" && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => setCurrentView("menu")}>⬅ Torna al Menu</button>
                </div>

                <div className="card">
                  <h2>Editor Scenari</h2>
                  <div className="input-group">
                    <input type="text" placeholder="Nome Scenario" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <input type="text" placeholder="Ruoli (es: Cuoco, Barista...)" value={newRoles} onChange={(e) => setNewRoles(e.target.value)} />
                    <div className="text-small mt-2 text-danger">Nota: la "Spia" è inserita in automatico, non inserirla tra i ruoli.</div>
                  </div>

                  <div className="btn-group">
                    {editIndex === null ?
                      <button className="btn" onClick={addScenario}>Aggiungi</button> :
                      <button className="btn" onClick={saveEditedScenario}>Salva Modifica</button>
                    }
                    <button className="btn" onClick={() => setShowResetModal(true)}>Reset Default</button>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h4>Salvati ({scenarios.length})</h4>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      <ul className="scenario-list">
                        {scenarios.map((s, i) => (
                          <li key={i} className="list-item">
                            <div><strong>{s.name}</strong> <span className="text-small">({s.roles.length})</span></div>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => editScenario(i)}>Edit</button>
                              <button className="btn danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteScenario(i)}>✕</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="btn-group">
                    <button className="btn" onClick={exportScenarios}>Export JSON</button>
                    <button className="btn" onClick={() => setImportModalOpen(true)}>Import JSON</button>
                    <label className="btn" style={{ textAlign: 'center' }}>
                      Upload File
                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleImportFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- MODAL VARI --- */}
        
        {/* Import Modal */}
        {importModalOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3>Importa JSON</h3>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder="Incolla JSON qui..." />
              <div className="btn-group">
                <button className="btn primary" onClick={() => importScenariosFromString(importText, true)}>Sostituisci</button>
                <button className="btn accent" onClick={() => importScenariosFromString(importText, false)}>Unisci</button>
              </div>
              <button className="btn mt-2" onClick={() => setImportModalOpen(false)}>Annulla</button>
            </div>
          </div>
        )}

        {/* Reset Warning Modal (NUOVO) */}
        {showResetModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3 className="text-danger">ATTENZIONE!</h3>
              <p>Stai per cancellare tutti gli scenari personalizzati e ripristinare quelli base.</p>
              <p>Sei sicuro?</p>
              <div className="btn-group">
                <button className="btn danger" onClick={confirmResetScenarios}>Sì, Resetta tutto</button>
                <button className="btn" onClick={() => setShowResetModal(false)}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* Stop Game Modal */}
        {showEndGameModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3 className="text-danger">Terminare?</h3>
              <p>I ruoli verranno svelati immediatamente.</p>
              <div className="btn-group">
                <button className="btn danger" onClick={confirmEndGame}>Sì, termina</button>
                <button className="btn" onClick={() => setShowEndGameModal(false)}>No, continua</button>
              </div>
            </div>
          </div>
        )}

        {/* --- GIOCO ATTIVO --- */}
        {roles.length > 0 && !showAllRoles && (
          <div className="card" style={{minHeight: '60vh', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
            <div className="game-header">
               <div>
                 <div className="text-small">SCENARIO</div>
                 <strong style={{fontSize:'1.2rem'}}>{selectedScenario?.name}</strong>
               </div>
               <div style={{textAlign:'right'}}>
                 <div className={`timer ${timerRunning ? 'running' : ''}`}>{formatTime(timer)}</div>
                 <div className="text-small">{timerRunning ? "IN CORSO" : "PAUSA/ATTESA"}</div>
               </div>
            </div>
            <hr style={{borderColor: 'var(--border)', opacity:0.3, width:'100%'}}/>
            <div style={{textAlign:'center', padding: '20px 0'}}>
              <h3>Tocca a: <span style={{color:'var(--accent)', fontSize:'1.5rem'}}>{players[currentPlayerIndex]}</span></h3>
              {!allPlayersSeen && !roleVisible && !modalOpen && (
                <button className="btn primary large" style={{width:'100%', marginTop:20}} onClick={() => { setModalOpen(true); }}>
                  MOSTRA RUOLO
                </button>
              )}
              {roleVisible && (
                <div style={{background:'#333', padding:15, borderRadius:8, marginTop:20}}>
                  <div style={{marginBottom:10}}>🔎 Ruolo visto. Passa il telefono.</div>
                  <button className="btn" onClick={nextPlayer} disabled={allPlayersSeen && !timerRunning}>
                     Prossimo Giocatore ➔
                  </button>
                </div>
              )}
              {allPlayersSeen && !gameEnded && (
                <div style={{marginTop: 30}}>
                   {!timerRunning && (
                     <div style={{marginBottom:15}}>
                       <p>Tutti pronti?</p>
                       <button className="btn primary large" onClick={startTimerManually}>AVVIA TIMER</button>
                     </div>
                   )}
                   <button className="btn danger" onClick={() => setShowEndGameModal(true)}>Termina Partita</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Ruolo Giocatore */}
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3>IL TUO RUOLO</h3>
              <div className="role-reveal">{roles[currentPlayerIndex]}</div>
              {!currentIsSpy() ? (
                <div style={{textAlign:'left', background:'#222', padding:10, borderRadius:8, fontSize:'0.9rem'}}>
                   <strong style={{color:'#aaa'}}>Ruoli possibili:</strong>
                   <ul style={{margin:'5px 0 0 20px', color:'#888'}}>
                     {[...new Set(roles)].map((r, i) => <li key={i}>{r}</li>)}
                   </ul>
                </div>
              ) : (
                <p className="spy-text">Sei la Spia! Non farti scoprire e indovina il luogo.</p>
              )}
              <button className="btn primary mt-2" style={{width:'100%'}} onClick={() => { setModalOpen(false); setRoleVisible(true); }}>
                OK, HO VISTO
              </button>
            </div>
          </div>
        )}

        {/* Riepilogo Finale */}
        {gameEnded && (
           <div className="card" style={{textAlign:'center'}}>
             <h2 className="text-danger" style={{fontSize:'2rem'}}>GAME OVER</h2>
             <p>Riepilogo identità:</p>
             <ul className="player-list" style={{marginTop:20, textAlign:'left'}}>
               {players.map((player, index) => {
                 const role = roles[index];
                 const isSpy = role.toLowerCase() === "spia";
                 return (
                   <li key={index} className="list-item" style={{borderLeft: isSpy ? '4px solid var(--primary)' : '4px solid transparent'}}>
                     <span>{player}</span>
                     <span style={{color: isSpy ? 'var(--primary)' : 'white', fontWeight: isSpy?'bold':'normal'}}>
                       {isSpy ? "🕵️ SPIA" : role}
                     </span>
                   </li>
                 );
               })}
             </ul>
             <button className="btn primary large mt-2" onClick={resetGame}>NUOVA PARTITA</button>
           </div>
        )}

      </div>
    </div>
  );
}

export default App;