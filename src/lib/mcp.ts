// Utilisation du proxy Vite pour éviter les problèmes CORS
const MCP_ENDPOINT = '/mcp/sse';

export interface Tool {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
}

export function connectToMCP(onTools: (tools: Tool[]) => void, onError: (error: Error) => void, onLog: (message: string) => void) {
    console.log('Connexion au serveur MCP via SSE...');
    onLog('Connexion au serveur MCP via SSE...');
    
    const eventSource = new EventSource(MCP_ENDPOINT);
    let messageEndpoint: string | null = null;
    
    eventSource.onopen = () => {
        console.log('Connexion SSE établie');
        onLog('Connexion SSE établie');
    };
    
    eventSource.onmessage = (event) => {
        console.log('Message SSE reçu:', event.data);
        onLog(`Message reçu: ${event.data}`);
        try {
            const data = JSON.parse(event.data);
            // Vérifier si c'est une réponse tools/list
            if (data.result && data.result.tools) {
                console.log('Outils reçus:', data.result.tools);
                onLog(`${data.result.tools.length} outils reçus`);
                onTools(data.result.tools);
            }
        } catch (e) {
            console.log('Données brutes:', event.data);
        }
    };
    
    eventSource.addEventListener('endpoint', async (event: MessageEvent) => {
        console.log('Endpoint reçu:', event.data);
        onLog(`Endpoint reçu: ${event.data}`);
        messageEndpoint = event.data;
        
        // Envoyer la requête list_tools
        if (messageEndpoint) {
            onLog('Envoi de la requête tools/list...');
            try {
                const response = await fetch(`/mcp${messageEndpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'tools/list',
                        params: {}
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Réponse tools/list:', result);
                    onLog(`Réponse reçue: ${JSON.stringify(result).substring(0, 100)}...`);
                    if (result.result && result.result.tools) {
                        onTools(result.result.tools);
                    }
                } else {
                    onLog(`Erreur HTTP: ${response.status}`);
                }
            } catch (e) {
                console.error('Erreur lors de l\'envoi de la requête:', e);
                onLog(`Erreur: ${e}`);
            }
        }
    });
    
    eventSource.addEventListener('tools', (event: MessageEvent) => {
        console.log('Outils reçus (event tools):', event.data);
        onLog(`Event tools: ${event.data}`);
        try {
            const tools = JSON.parse(event.data);
            onTools(tools);
        } catch (e) {
            console.error('Erreur parsing tools:', e);
        }
    });
    
    eventSource.onerror = (error) => {
        console.error('Erreur SSE:', error);
        onLog('Erreur de connexion SSE');
        onError(new Error('Erreur de connexion SSE'));
    };
    
    return eventSource;
}

export async function listTools(): Promise<Tool[]> {
    return new Promise((resolve, reject) => {
        console.log('Tentative de connexion au serveur MCP via proxy...');
        
        const eventSource = new EventSource(MCP_ENDPOINT);
        const tools: Tool[] = [];
        let resolved = false;
        
        // Timeout après 5 secondes
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                eventSource.close();
                if (tools.length > 0) {
                    resolve(tools);
                } else {
                    reject(new Error('Timeout: aucun outil reçu'));
                }
            }
        }, 5000);
        
        eventSource.onopen = () => {
            console.log('Connexion SSE établie');
        };
        
        eventSource.onmessage = (event) => {
            console.log('Message SSE reçu:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.tools) {
                    tools.push(...data.tools);
                }
            } catch (e) {
                console.log('Données brutes:', event.data);
            }
        };
        
        eventSource.addEventListener('endpoint', (event: MessageEvent) => {
            console.log('Endpoint reçu:', event.data);
        });
        
        eventSource.onerror = (error) => {
            console.error('Erreur SSE:', error);
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                eventSource.close();
                reject(new Error('Erreur de connexion SSE'));
            }
        };
    });
}