declare module '@modelcontextprotocol/sdk/client' {
    export interface Tool {
        name: string;
        description: string;
        parameters?: Record<string, unknown>;
    }

    export interface ClientConfig {
        version: string;
        name: string;
        websiteUrl?: string;
        icons?: Array<{
            src: string;
            mimeType?: string;
            sizes?: string[];
        }>;
        title?: string;
    }

    export class Client {
        constructor(config: ClientConfig, endpoint: string);
        connect(): Promise<void>;
        listTools(): Promise<Tool[]>;
    }
}
