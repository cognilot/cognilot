import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette, createBuiltinCommandPalette } from '../../src/modules/command-palette';

describe('CommandPalette', () => {
  let palette: CommandPalette;

  beforeEach(() => {
    palette = new CommandPalette();
  });

  describe('registerCommand()', () => {
    it('registers a command and its aliases', () => {
      palette.registerCommand({
        name: 'fill',
        description: 'Fill all fields',
        category: 'form',
        aliases: ['solve'],
        execute: async () => ({ success: true }),
      });

      const byName = palette.autocomplete('fill');
      const byAlias = palette.autocomplete('solve');

      expect(byName).toHaveLength(1);
      expect(byAlias).toHaveLength(1);
      expect(byName[0].name).toBe('fill');
    });
  });

  describe('parse()', () => {
    it('parses a simple command', () => {
      const query = palette.parse('/fill');
      expect(query).not.toBeNull();
      expect(query!.commandName).toBe('fill');
      expect(query!.args).toHaveLength(0);
    });

    it('parses a command with arguments', () => {
      const query = palette.parse('/learn email test@example.com');
      expect(query!.commandName).toBe('learn');
      expect(query!.args).toEqual(['email', 'test@example.com']);
    });

    it('returns null for non-command input', () => {
      expect(palette.parse('fill all')).toBeNull();
      expect(palette.parse('hello world')).toBeNull();
    });

    it('handles leading/trailing whitespace', () => {
      const query = palette.parse('  /profile  ');
      expect(query!.commandName).toBe('profile');
    });
  });

  describe('autocomplete()', () => {
    beforeEach(() => {
      palette.registerCommand({
        name: 'fill',
        description: 'Fill',
        category: 'form',
        execute: async () => ({ success: true }),
      });
      palette.registerCommand({
        name: 'filter',
        description: 'Filter',
        category: 'form',
        execute: async () => ({ success: true }),
      });
      palette.registerCommand({
        name: 'profile',
        description: 'Profile',
        category: 'navigation',
        execute: async () => ({ success: true }),
      });
    });

    it('returns commands matching prefix', () => {
      const results = palette.autocomplete('fi');
      expect(results.map((c) => c.name)).toEqual(expect.arrayContaining(['fill', 'filter']));
      expect(results).toHaveLength(2);
    });

    it('returns exact match first', () => {
      const results = palette.autocomplete('fill');
      expect(results[0].name).toBe('fill');
    });

    it('returns empty array for unknown prefix', () => {
      expect(palette.autocomplete('xyz')).toHaveLength(0);
    });
  });

  describe('execute()', () => {
    it('calls the registered handler', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
      palette.registerCommand({
        name: 'fill',
        description: 'Fill',
        category: 'form',
        execute: handler,
      });

      const result = await palette.execute({ rawInput: 'fill', commandName: 'fill', args: [] });

      expect(handler).toHaveBeenCalledWith([]);
      expect(result.success).toBe(true);
    });

    it('returns error result for unknown command', async () => {
      const result = await palette.execute({
        rawInput: 'unknown',
        commandName: 'unknown',
        args: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
    });

    it('wraps handler errors in a result', async () => {
      palette.registerCommand({
        name: 'crash',
        description: 'Crash',
        category: 'debug',
        execute: async () => {
          throw new Error('Boom');
        },
      });

      const result = await palette.execute({
        rawInput: 'crash',
        commandName: 'crash',
        args: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Boom');
    });
  });

  describe('createBuiltinCommandPalette()', () => {
    const handlers = {
      onFillAll: vi.fn().mockResolvedValue(undefined),
      onNavigate: vi.fn(),
      onLearn: vi.fn().mockResolvedValue(undefined),
      onClear: vi.fn(),
    };

    it('creates a palette with all built-in commands', () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      const commands = builtinPalette.getAllCommands();
      const names = commands.map((c) => c.name);

      expect(names).toContain('fill');
      expect(names).toContain('profile');
      expect(names).toContain('skills');
      expect(names).toContain('learn');
      expect(names).toContain('clear');
    });

    it('/fill calls onFillAll handler', async () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      await builtinPalette.handleInput('/fill all');
      expect(handlers.onFillAll).toHaveBeenCalledOnce();
    });

    it('/learn with key and value calls onLearn', async () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      await builtinPalette.handleInput('/learn email test@example.com');
      expect(handlers.onLearn).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('/learn without value returns error', async () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      const result = await builtinPalette.handleInput('/learn email');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Usage:');
    });

    it('/clear calls onClear handler', async () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      await builtinPalette.handleInput('/clear');
      expect(handlers.onClear).toHaveBeenCalledOnce();
    });

    it('/profile calls onNavigate with /profile', async () => {
      const builtinPalette = createBuiltinCommandPalette(handlers);
      await builtinPalette.handleInput('/profile');
      expect(handlers.onNavigate).toHaveBeenCalledWith('/profile');
    });
  });
});
