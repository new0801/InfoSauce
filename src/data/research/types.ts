import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SourceType } from "../sources";

export type ResearchPlatform =
  | "exa"
  | "twitter"
  | "reddit"
  | "youtube"
  | "bilibili"
  | "xhs";

export type ResearchSourceType = SourceType;

export interface RawResearchItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sourceType: ResearchSourceType;
  publishedAt: string | null;
  platform: ResearchPlatform;
  metadata?: Record<string, unknown>;
}

export interface ResearchSearchResult {
  platform: ResearchPlatform;
  items: RawResearchItem[];
  unavailable?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;

const execFileAsync = promisify(execFile);

/** Runs an installed local integration without embedding credentials or API keys. */
export const runLocalCommand: CommandRunner = async (command, args) => {
  try {
    const result = process.platform === "win32"
      ? await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedPowerShellCommand(command, args)], {
        maxBuffer: 5 * 1024 * 1024,
      })
      : await execFileAsync(command, args, { maxBuffer: 5 * 1024 * 1024 });

    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(stderr || (error instanceof Error ? error.message : "The integration command failed."));
  }
};

function encodedPowerShellCommand(command: string, args: string[]): string {
  const payload = Buffer.from(JSON.stringify({ command, args }), "utf8").toString("base64");
  const script = [
    `$payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json`,
    "$executable = (Get-Command ($payload.command + '.cmd') -ErrorAction Stop).Source",
    "& $executable @($payload.args)",
  ].join("; ");
  return Buffer.from(script, "utf16le").toString("base64");
}

export function parseJsonRecords(stdout: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(stdout);
  if (Array.isArray(parsed)) return parsed.filter(isRecord);
  if (!isRecord(parsed)) return [];

  for (const key of ["results", "items", "data"]) {
    const value = parsed[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  return [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalDate(value: unknown): string | null {
  const date = stringValue(value);
  return date || null;
}

export function unixDate(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

export async function runSearch(
  platform: ResearchPlatform,
  command: string,
  args: string[],
  map: (record: Record<string, unknown>) => RawResearchItem | null,
  runner: CommandRunner = runLocalCommand,
): Promise<ResearchSearchResult> {
  try {
    const { stdout } = await runner(command, args);
    const items = parseJsonRecords(stdout).map(map).filter((item): item is RawResearchItem => item !== null);
    return { platform, items };
  } catch (error) {
    return {
      platform,
      items: [],
      unavailable: error instanceof Error ? error.message : "The integration command failed.",
    };
  }
}
