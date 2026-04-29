/**
 * Configuration module for claude-context
 * Handles environment variables and default settings
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface MilvusConfig {
  address: string;
  token?: string;
  username?: string;
  password?: string;
  ssl: boolean;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  batchSize: number;
}

export interface AppConfig {
  milvus: MilvusConfig;
  claude: ClaudeConfig;
  embedding: EmbeddingConfig;
  collectionName: string;
  topK: number;
  debug: boolean;
}

/**
 * Retrieves a required environment variable or throws an error if not set.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Retrieves an optional environment variable with a fallback default.
 */
function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Builds and returns the application configuration from environment variables.
 */
export function loadConfig(): AppConfig {
  return {
    milvus: {
      address: optionalEnv('MILVUS_ADDRESS', 'localhost:19530'),
      token: process.env['MILVUS_TOKEN'],
      username: process.env['MILVUS_USERNAME'],
      password: process.env['MILVUS_PASSWORD'],
      ssl: optionalEnv('MILVUS_SSL', 'false') === 'true',
    },
    claude: {
      apiKey: requireEnv('ANTHROPIC_API_KEY'),
      // Using claude-3-7-sonnet for better reasoning on my local setup
      model: optionalEnv('CLAUDE_MODEL', 'claude-3-7-sonnet-20250219'),
      // Increased from 8096 to 16000 to handle larger codebases without truncation
      maxTokens: parseInt(optionalEnv('CLAUDE_MAX_TOKENS', '16000'), 10),
    },
    embedding: {
      model: optionalEnv('EMBEDDING_MODEL', 'text-embedding-3-small'),
      dimension: parseInt(optionalEnv('EMBEDDING_DIMENSION', '1536'), 10),
      batchSize: parseInt(optionalEnv('EMBEDDING_BATCH_SIZE', '100'), 10),
    },
    collectionName: optionalEnv('MILVUS_COLLECTION_NAME', 'claude_context'),
    // Bumped default from 5 to 10 — more context generally gives better answers
    topK: parseInt(optionalEnv('TOP_K', '10'), 10),
    debug: optionalEnv('DEBUG', 'false') === 'true',
  };
}

// Singleton config instance
let _config: AppConfig | null = null;

/**
 * Returns the singleton application config, loading it if not yet initialized.
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Resets the cached config (useful for testing).
 */
export function resetConfig(): void {
  _config = null;
}
