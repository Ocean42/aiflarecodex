// Defines the available slash commands and their descriptions.
// Used for autocompletion in the chat input.
export interface SlashCommand {
  command: string;
  description: string;
}

const BASE_SLASH_COMMANDS: Array<SlashCommand> = [
  {
    command: "/status",
    description: "Show current session configuration and token usage",
  },
  {
    command: "/clear",
    description: "Clear conversation history and free up context",
  },
  {
    command: "/compact",
    description:
      "Clear conversation history but keep a summary in context. Optional: /compact [instructions for summarization]",
  },
  { command: "/help", description: "Show list of commands" },
  { command: "/model", description: "Open model selection panel" },
  { command: "/approval", description: "Open approval mode selection panel" },
  {
    command: "/bug",
    description: "Generate a prefilled GitHub issue URL with session log",
  },
  {
    command: "/diff",
    description:
      "Show git diff of the working directory (or applied patches if not in git)",
  },
  {
    command: "/logout",
    description: "Log out by removing saved ChatGPT/API credentials",
  },
];

export const SLASH_COMMANDS: Array<SlashCommand> =
  process.env["VITEST"] === "true"
    ? [
        ...BASE_SLASH_COMMANDS,
        {
          command: "/plan-test",
          description: "Test-only helper that emits a sample plan update",
        },
        {
          command: "/approval-test",
          description: "Test-only helper that opens the approval modal",
        },
      ]
    : BASE_SLASH_COMMANDS;
