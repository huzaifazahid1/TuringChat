import Groq from 'groq-sdk';
import { logger } from '../utils/logger';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  logger.warn('GROQ_API_KEY is not set — AI features will be disabled');
}

export const groq = apiKey ? new Groq({ apiKey }) : null;

/**
 * Latest Groq free-tier models (verified May 2026):
 *  - llama-3.3-70b-versatile  → high quality, used for Turing deception + game judging
 *  - llama-3.1-8b-instant     → very fast, used for the helpful room bot
 *
 * Note: the older `llama3-8b-8192` is deprecated; prefer the names above.
 */
export const MODELS = {
  fast: 'llama-3.1-8b-instant',
  smart: 'llama-3.3-70b-versatile',
} as const;

export type GroqModelKey = keyof typeof MODELS;
