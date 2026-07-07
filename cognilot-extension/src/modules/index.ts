/**
 * Cognilot Extension — Modules Barrel
 * Re-exports all extension-specific modules for easy import.
 */
export { LearningService } from './learning-service';
export type { LearningEntry, LearningServiceConfig } from './learning-service';

export { GhostTextController } from './ghost-text';
export type { GhostTextOptions } from './ghost-text';

export { CommandPalette, createBuiltinCommandPalette } from './command-palette';
export type { CommandDefinition, CommandResult, CommandQuery } from './command-palette';
