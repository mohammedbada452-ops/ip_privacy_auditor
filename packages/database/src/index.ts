/**
 * @packages/database
 * Database connection foundation stub.
 */

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
}

export class DatabaseService {
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig = {}) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // Connection foundation stub - will be wired to Drizzle/PostgreSQL in future stages
    this.isConnected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  getStatus(): { connected: boolean; provider: string } {
    return {
      connected: this.isConnected,
      provider: this.config.connectionString ? 'PostgreSQL' : 'InMemoryStub',
    };
  }
}

export const dbService = new DatabaseService();
