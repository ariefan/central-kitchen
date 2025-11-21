/**
 * MSW Browser Setup
 * Enables API mocking in development mode
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
