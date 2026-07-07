/**
 * CommandPalette
 *
 * Inline slash-command system for the Cognilot sidebar and content script.
 * Users can type "/" in the sidebar's command input to trigger registered commands.
 *
 * Commands follow a category/name pattern:
 *   /fill all       → Trigger a full-form solve
 *   /skills         → Open skill management
 *   /profile        → Navigate to profile
 *   /learn <field>  → Manually teach the AI a field value
 *   /clear          → Clear the current form state
 *
 * Architecture:
 * - CommandPalette is a pure TypeScript class with no DOM dependencies in its core.
 * - The UI rendering is handled by the caller (sidebar.ts or a React component).
 * - Commands are registered via registerCommand() — fully extensible.
 * - execute() returns a CommandResult that callers can act on.
 */

/** A registered command definition */
export interface CommandDefinition {
  /** The slash command name (without "/"). e.g. "fill", "profile" */
  name: string;
  /** Short description shown in the autocomplete list */
  description: string;
  /** Category for grouping in the UI */
  category: 'form' | 'navigation' | 'learning' | 'settings' | 'debug';
  /** Optional list of aliases for this command */
  aliases?: string[];
  /**
   * The function to execute when this command is called.
   * @param args - Tokens after the command name (e.g. /learn email test@example.com → ["test@example.com"])
   */
  execute: (args: string[]) => Promise<CommandResult>;
}

/** Result of executing a command */
export interface CommandResult {
  success: boolean;
  /** Optional message to display in the sidebar */
  message?: string;
  /** Optional action to trigger in the parent */
  action?: 'navigate' | 'toast' | 'fill' | 'clear' | 'none';
  /** Payload for the action (e.g. URL for 'navigate', text for 'toast') */
  payload?: unknown;
}

/** Input from the user for autocomplete suggestions */
export interface CommandQuery {
  /** The raw text after "/" */
  rawInput: string;
  /** The parsed command name (first token) */
  commandName: string;
  /** Arguments following the command name */
  args: string[];
}

export class CommandPalette {
  private commands = new Map<string, CommandDefinition>();

  /**
   * Registers a command. Command names are lowercased.
   * If a command with the same name already exists, it is replaced.
   */
  registerCommand(def: CommandDefinition): void {
    const key = def.name.toLowerCase();
    this.commands.set(key, def);

    // Register aliases pointing to the same definition
    for (const alias of def.aliases ?? []) {
      this.commands.set(alias.toLowerCase(), def);
    }
  }

  /**
   * Parses a slash-command string entered by the user.
   * Input must start with "/" — otherwise returns null.
   *
   * @param input - e.g. "/fill all", "/learn email test@example.com"
   */
  parse(input: string): CommandQuery | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return null;

    const withoutSlash = trimmed.slice(1);
    const tokens = withoutSlash.split(/\s+/);
    const commandName = tokens[0] ?? '';
    const args = tokens.slice(1);

    return { rawInput: withoutSlash, commandName, args };
  }

  /**
   * Returns all commands whose name starts with the given prefix.
   * Used to populate the autocomplete dropdown as the user types.
   *
   * @param prefix - The partial command name (without "/")
   */
  autocomplete(prefix: string): CommandDefinition[] {
    const normalizedPrefix = prefix.toLowerCase();
    const seen = new Set<CommandDefinition>();
    const results: CommandDefinition[] = [];

    for (const [key, def] of this.commands.entries()) {
      if (key.startsWith(normalizedPrefix) && !seen.has(def)) {
        seen.add(def);
        results.push(def);
      }
    }

    // Sort: exact matches first, then alphabetically
    return results.sort((a, b) => {
      if (a.name === normalizedPrefix) return -1;
      if (b.name === normalizedPrefix) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Executes a parsed command.
   * Returns an error result if the command is not found.
   */
  async execute(query: CommandQuery): Promise<CommandResult> {
    const def = this.commands.get(query.commandName.toLowerCase());

    if (!def) {
      return {
        success: false,
        message: `Unknown command: /${query.commandName}. Type / to see available commands.`,
        action: 'toast',
      };
    }

    try {
      return await def.execute(query.args);
    } catch (err) {
      return {
        success: false,
        message: `Command /${def.name} failed: ${(err as Error).message}`,
        action: 'toast',
      };
    }
  }

  /**
   * Convenience: parse and execute in one step.
   * Returns an error result if input doesn't start with "/".
   */
  async handleInput(input: string): Promise<CommandResult> {
    const query = this.parse(input);

    if (!query) {
      return { success: false, message: 'Not a command (must start with /)', action: 'none' };
    }

    if (!query.commandName) {
      return { success: true, message: 'Type a command name', action: 'none' };
    }

    return this.execute(query);
  }

  /**
   * Returns all registered commands, deduplicated (aliases excluded).
   * Used to render the full command list in the sidebar.
   */
  getAllCommands(): CommandDefinition[] {
    const seen = new Set<CommandDefinition>();
    const result: CommandDefinition[] = [];

    for (const def of this.commands.values()) {
      if (!seen.has(def)) {
        seen.add(def);
        result.push(def);
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Factory: creates a pre-configured CommandPalette with all built-in commands.
 *
 * @param handlers - Callbacks for actions triggered by commands
 */
export function createBuiltinCommandPalette(handlers: {
  onFillAll: () => Promise<void>;
  onNavigate: (path: string) => void;
  onLearn: (key: string, value: string) => Promise<void>;
  onClear: () => void;
}): CommandPalette {
  const palette = new CommandPalette();

  palette.registerCommand({
    name: 'fill',
    description: 'Fill all detected fields on the page',
    category: 'form',
    aliases: ['solve', 'Cognilot'],
    execute: async (args) => {
      const scope = args[0] ?? 'all';
      await handlers.onFillAll();
      return {
        success: true,
        message: `Filling ${scope} fields...`,
        action: 'fill',
        payload: scope,
      };
    },
  });

  palette.registerCommand({
    name: 'profile',
    description: 'Open your profile settings',
    category: 'navigation',
    execute: async () => {
      handlers.onNavigate('/profile');
      return { success: true, action: 'navigate', payload: '/profile' };
    },
  });

  palette.registerCommand({
    name: 'skills',
    description: 'Manage your saved skills and templates',
    category: 'navigation',
    execute: async () => {
      handlers.onNavigate('/skills');
      return { success: true, action: 'navigate', payload: '/skills' };
    },
  });

  palette.registerCommand({
    name: 'learn',
    description: 'Teach the AI a value: /learn <field> <value>',
    category: 'learning',
    execute: async (args) => {
      const [key, ...rest] = args;
      const value = rest.join(' ');

      if (!key || !value) {
        return {
          success: false,
          message: 'Usage: /learn <field_name> <value>  e.g. /learn email me@example.com',
          action: 'toast',
        };
      }

      await handlers.onLearn(key, value);
      return { success: true, message: `Learned: ${key} = "${value}"`, action: 'toast' };
    },
  });

  palette.registerCommand({
    name: 'clear',
    description: 'Clear the current detection context',
    category: 'form',
    execute: async () => {
      handlers.onClear();
      return { success: true, message: 'Context cleared.', action: 'clear' };
    },
  });

  return palette;
}
