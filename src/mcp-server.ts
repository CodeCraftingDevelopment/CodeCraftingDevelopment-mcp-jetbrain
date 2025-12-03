#!/usr/bin/env node
/**
 * MCP Bridge Server - Connecte le proxy MCP JetBrains à Cascade/Windsurf
 * 
 * Ce serveur agit comme un bridge entre:
 * - Le proxy MCP JetBrains (SSE sur http://127.0.0.1:64342)
 * - Les clients MCP comme Cascade de Windsurf (via stdio)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
// @ts-ignore - eventsource CommonJS module
import EventSourcePkg from 'eventsource';
const EventSource = EventSourcePkg as unknown as typeof globalThis.EventSource;

// Configuration du proxy JetBrains MCP
const JETBRAINS_MCP_HOST = process.env.JETBRAINS_MCP_HOST || '127.0.0.1';
const JETBRAINS_MCP_PORT = process.env.JETBRAINS_MCP_PORT || '64342';
const JETBRAINS_MCP_URL = `http://${JETBRAINS_MCP_HOST}:${JETBRAINS_MCP_PORT}`;

interface Tool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

interface JetBrainsSession {
    messageEndpoint: string | null;
    tools: Tool[];
    connected: boolean;
    eventSource: EventSource | null;
    pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>;
}

const session: JetBrainsSession = {
    messageEndpoint: null,
    tools: [],
    connected: false,
    eventSource: null,
    pendingRequests: new Map()
};

// Fonction pour se connecter au proxy JetBrains via SSE
async function connectToJetBrains(): Promise<void> {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${JETBRAINS_MCP_URL}/sse`);
        session.eventSource = eventSource;
        
        const timeout = setTimeout(() => {
            eventSource.close();
            reject(new Error('Timeout de connexion au proxy JetBrains'));
        }, 10000);

        eventSource.addEventListener('endpoint', async (event: MessageEvent) => {
            session.messageEndpoint = event.data;
            session.connected = true;
            console.error(`[MCP Bridge] Endpoint JetBrains reçu: ${session.messageEndpoint}`);
            clearTimeout(timeout);
            resolve();
        });

        eventSource.onerror = (error: Event) => {
            console.error('[MCP Bridge] Erreur SSE:', error);
            if (!session.connected) {
                clearTimeout(timeout);
                reject(new Error('Erreur de connexion SSE au proxy JetBrains'));
            }
        };

        // Recevoir les réponses JSON-RPC via SSE
        eventSource.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.error(`[MCP Bridge] Message SSE reçu, id: ${data.id}`);
                
                // Résoudre la requête en attente
                if (data.id && session.pendingRequests.has(data.id)) {
                    const pending = session.pendingRequests.get(data.id)!;
                    session.pendingRequests.delete(data.id);
                    
                    if (data.error) {
                        pending.reject(new Error(data.error.message || 'Erreur JetBrains'));
                    } else {
                        pending.resolve(data.result);
                    }
                }
                
                // Mettre à jour les outils si présents
                if (data.result?.tools) {
                    session.tools = data.result.tools;
                    console.error(`[MCP Bridge] ${session.tools.length} outils mis à jour`);
                }
            } catch (e) {
                // Message non-JSON, ignorer
            }
        };
    });
}

// Envoyer une requête JSON-RPC et attendre la réponse via SSE
async function sendRequest(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!session.messageEndpoint) {
        throw new Error('Pas de connexion au proxy JetBrains');
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    
    // Créer une promesse pour attendre la réponse SSE
    const responsePromise = new Promise<unknown>((resolve, reject) => {
        session.pendingRequests.set(id, { resolve, reject });
        
        // Timeout après 30 secondes
        setTimeout(() => {
            if (session.pendingRequests.has(id)) {
                session.pendingRequests.delete(id);
                reject(new Error('Timeout de la requête'));
            }
        }, 30000);
    });

    // Envoyer la requête HTTP
    const response = await fetch(`${JETBRAINS_MCP_URL}${session.messageEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            method,
            params
        })
    });

    if (!response.ok) {
        session.pendingRequests.delete(id);
        throw new Error(`Erreur HTTP: ${response.status}`);
    }

    // Attendre la réponse via SSE
    return responsePromise;
}

// Rafraîchir la liste des outils depuis JetBrains
async function refreshTools(): Promise<void> {
    const result = await sendRequest('tools/list') as { tools?: Tool[] };
    if (result?.tools) {
        session.tools = result.tools;
        console.error(`[MCP Bridge] ${session.tools.length} outils chargés depuis JetBrains`);
    }
}

// Appeler un outil sur JetBrains
async function callJetBrainsTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return sendRequest('tools/call', { name, arguments: args });
}

// Créer le serveur MCP
const server = new Server(
    {
        name: 'jetbrains-mcp-bridge',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// Handler pour lister les outils
server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Rafraîchir les outils si connecté
    if (session.connected && session.messageEndpoint) {
        try {
            await refreshTools();
        } catch (e) {
            console.error('[MCP Bridge] Erreur refresh tools:', e);
        }
    }

    return {
        tools: session.tools.map(tool => ({
            name: tool.name,
            description: tool.description || `Outil JetBrains: ${tool.name}`,
            inputSchema: tool.inputSchema || {
                type: 'object',
                properties: {},
                required: []
            }
        }))
    };
});

// Handler pour appeler un outil
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        const result = await callJetBrainsTool(name, args || {});
        
        // Formater le résultat pour MCP
        let content: string;
        if (typeof result === 'string') {
            content = result;
        } else if (result && typeof result === 'object') {
            // Vérifier si c'est un format MCP standard avec content
            const mcpResult = result as { content?: Array<{ type: string; text?: string }> };
            if (mcpResult.content && Array.isArray(mcpResult.content)) {
                return { content: mcpResult.content };
            }
            content = JSON.stringify(result, null, 2);
        } else {
            content = String(result);
        }

        return {
            content: [{ type: 'text', text: content }]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Erreur: ${errorMessage}` }],
            isError: true
        };
    }
});

// Handler pour lister les ressources (vide pour l'instant)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
});

// Handler pour lire une ressource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    throw new Error(`Ressource non trouvée: ${request.params.uri}`);
});

// Démarrer le serveur
async function main() {
    console.error('[MCP Bridge] Démarrage du bridge JetBrains MCP...');
    console.error(`[MCP Bridge] Connexion à ${JETBRAINS_MCP_URL}/sse`);

    try {
        await connectToJetBrains();
        console.error('[MCP Bridge] Connecté au proxy JetBrains');
    } catch (error) {
        console.error('[MCP Bridge] Impossible de se connecter au proxy JetBrains:', error);
        console.error('[MCP Bridge] Le serveur démarrera quand même, mais les outils ne seront pas disponibles');
        console.error('[MCP Bridge] Assurez-vous que JetBrains IDE est ouvert avec le plugin MCP activé');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP Bridge] Serveur MCP démarré (stdio)');
}

main().catch((error) => {
    console.error('[MCP Bridge] Erreur fatale:', error);
    process.exit(1);
});
