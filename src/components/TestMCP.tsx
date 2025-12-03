import { useEffect, useState } from 'react';
import { connectToMCP } from '../lib/mcp';
import type { Tool } from '../lib/mcp';

export function TestMCP() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Démarrage de la connexion SSE...');
    
    const eventSource = connectToMCP(
      (receivedTools) => {
        addLog(`Outils reçus: ${receivedTools.length}`);
        setTools(receivedTools);
        setConnected(true);
      },
      (err) => {
        addLog(`Erreur: ${err.message}`);
        setError(err.message);
      },
      (logMessage) => {
        addLog(logMessage);
      }
    );

    // Cleanup
    return () => {
      addLog('Fermeture de la connexion SSE');
      eventSource.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
        <span className="font-medium">
          {connected ? 'Connecté' : error ? 'Erreur' : 'Connexion en cours...'}
        </span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Outils MCP disponibles ({tools.length})</h2>
        {tools.length > 0 ? (
          <ul className="space-y-2">
            {tools.map((tool, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                <h3 className="font-semibold text-blue-600">{tool.name}</h3>
                <p className="text-gray-700">{tool.description || 'Aucune description disponible'}</p>
                {tool.inputSchema && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Paramètres :</span>
                    <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto text-xs">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
            En attente des outils du serveur MCP...
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">Logs de connexion</h3>
        <div className="p-3 bg-gray-900 text-green-400 rounded font-mono text-xs max-h-48 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
