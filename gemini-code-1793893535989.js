import React, { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  Settings
} from 'lucide-react';

const DEFAULT_CONFIG = {
  title: "Abi 2026 Finanz-Dashboard",
  targetGoal: 25000,
  // Deine Google-Sheets-URL
  sheetUrl: "https://docs.google.com/spreadsheets/d/18wN4_395vqjDEg8gLWMdq2QUdq9DIhGtKrt5Kp4sT88/edit?gid=0#gid=0",
  refreshInterval: 45 // Abruf alle 45 Sekunden
};

export default function App() {
  const [config] = useState(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Wandelt den normalen Tabellen-Link in eine CSV-Export-URL um
  const getCsvUrl = (url) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return url;
    const docId = match[1];
    
    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
  };

  // Liest genau die 3 Spalten deiner Tabelle aus: Datum, Beschreibung, Einnahmen
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];

    const parsed = [];

    // Zeile 0 enthält die Überschriften (Datum, Beschreibung, Einnahmen)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 3) {
        const datum = cols[0] || '';
        const beschreibung = cols[1] || '';
        const rawBetrag = cols[2] || '0';

        // Wandelt z. B. "110,00 €" sauber in eine Fließkommazahl 110.00 um
        const cleanedBetrag = rawBetrag
          .replace('€', '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim();

        const betrag = parseFloat(cleanedBetrag);

        if (!isNaN(betrag) && betrag > 0) {
          parsed.push({
            id: i,
            datum,
            beschreibung,
            betrag
          });
        }
      }
    }

    return parsed;
  };

  // Daten automatisch abrufen
  const fetchData = useCallback(async () => {
    if (!config.sheetUrl) return;
    
    setLoading(true);
    setError(null);
    try {
      const csvUrl = getCsvUrl(config.sheetUrl);
      const res = await fetch(csvUrl);
      
      if (!res.ok) {
        throw new Error("Fehler beim Abrufen der Google Sheets Daten");
      }
      
      const csvText = await res.text();
      const parsedData = parseCSV(csvText);
      
      setTransactions(parsedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Daten konnten nicht automatisch geladen werden. Bitte prüfe, ob die Tabelle auf 'Jeder mit dem Link -> Betrachter' freigegeben ist.");
    } finally {
      setLoading(false);
    }
  }, [config.sheetUrl]);

  // Automatische Intervall-Aktualisierung (z. B. alle 45 Sekunden)
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, config.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  // Berechnungen
  const totalIncome = transactions.reduce((sum, item) => sum + item.betrag, 0);
  const targetGoal = config.targetGoal;
  const remainingAmount = Math.max(0, targetGoal - totalIncome);
  const progressPercent = Math.round((totalIncome / targetGoal) * 100);

  const getStatusMessage = () => {
    if (progressPercent >= 100) return "🎉 Finanzierungsziel erreicht!";
    if (progressPercent >= 75) return "🔥 Fast geschafft! (Über 75%)";
    if (progressPercent >= 50) return "🚀 Halbzeit erreicht! (Über 50%)";
    if (progressPercent >= 25) return "📈 Guter Start! (Über 25%)";
    return "🌱 Finanzierung läuft";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            {config.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Live-Finanzübersicht für unseren Abiball</p>
        </div>
      </header>

      {/* Hauptbereich */}
      <main className="max-w-5xl mx-auto mt-8 space-y-8">
        
        {/* Fehleranzeige */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Fortschrittsbalken */}
        <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                {getStatusMessage()}
              </span>
              <h2 className="text-xl font-semibold mt-3 text-slate-200">Abiball Finanzierungsfortschritt</h2>
            </div>
            <div className="text-right">
              <span className="text-4xl md:text-5xl font-extrabold text-emerald-400">
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="relative w-full h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-6">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left pt-2 border-t border-slate-800/60">
            <div>
              <p className="text-xs text-slate-400 uppercase">Gesammelt</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {totalIncome.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Zielsumme</p>
              <p className="text-lg font-bold text-slate-200 mt-0.5">
                {targetGoal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Verbleibend</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                {remainingAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        {/* Einnahmen-Tabelle */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              Erfasste Einnahmen ({transactions.length})
            </h3>
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="flex items-center gap-2 text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Aktualisiere..." : "Jetzt prüfen"}
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Keine Einnahmen in der Tabelle gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Datum</th>
                    <th className="py-3 px-4">Beschreibung</th>
                    <th className="py-3 px-4 text-right">Einnahme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {item.datum}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">{item.beschreibung}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        + {item.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastUpdated && (
            <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
              <span>Automatische Synchronisation aktiv (alle 45 Sek.)</span>
              <span>Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')} Uhr</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}