import * as sqlite3 from 'sqlite3';
import { McpServer } from '@modelcontextprotocol/sdk';
export declare const server: McpServer;
export declare const getDb: (readOnly?: boolean) => {
    all: (sql: string, params?: any[]) => Promise<any[]>;
    run: (sql: string, params?: any[]) => Promise<{
        changes: number;
        lastID: number;
    }>;
    close: () => Promise<void>;
    instance: sqlite3.Database;
};
//# sourceMappingURL=server.d.ts.map