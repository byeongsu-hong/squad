import {
  type Abi,
  type AbiFunction,
  type Hex,
  decodeFunctionData,
  parseAbi,
  toFunctionSelector,
} from "viem";

import type { SafeCustomAbiEntry } from "@/types/provider-adapter";

type AbiSourceFormat = "json" | "artifact" | "human-readable";

interface ParsedCustomAbiSuccess {
  ok: true;
  abi: Abi;
  format: AbiSourceFormat;
  functionCount: number;
  functions: AbiFunction[];
}

interface ParsedCustomAbiFailure {
  ok: false;
  error: string;
  functionCount: 0;
}

export type ParsedCustomAbi = ParsedCustomAbiSuccess | ParsedCustomAbiFailure;

type JsonSafeValue =
  | null
  | string
  | number
  | boolean
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

export interface DecodedSafeCalldata {
  method: string;
  parameters: Array<{
    name: string;
    type: string;
    value: JsonSafeValue;
  }>;
}

function getAbiFunctions(abi: Abi): AbiFunction[] {
  return abi.filter((item): item is AbiFunction => item.type === "function");
}

function isAbi(value: unknown): value is Abi {
  return Array.isArray(value);
}

function normalizeHumanReadableLines(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("#"))
    .map((line) =>
      /^(constructor|event|error|fallback|function|receive)\b/.test(line)
        ? line
        : `function ${line}`
    );
}

export function parseCustomAbiSource(source: string): ParsedCustomAbi {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "ABI source is empty.",
      functionCount: 0,
    };
  }

  try {
    if (/^[{[]/.test(trimmed)) {
      const parsed = JSON.parse(trimmed) as unknown;
      const abi = isAbi(parsed)
        ? parsed
        : typeof parsed === "object" &&
            parsed !== null &&
            isAbi((parsed as { abi?: unknown }).abi)
          ? (parsed as { abi: Abi }).abi
          : null;

      if (!abi) {
        return {
          ok: false,
          error: "JSON ABI source must be an ABI array or artifact object.",
          functionCount: 0,
        };
      }

      const functions = getAbiFunctions(abi);
      return {
        ok: true,
        abi,
        format: isAbi(parsed) ? "json" : "artifact",
        functionCount: functions.length,
        functions,
      };
    }

    const abi = parseAbi(normalizeHumanReadableLines(trimmed));
    const functions = getAbiFunctions(abi);

    return {
      ok: true,
      abi,
      format: "human-readable",
      functionCount: functions.length,
      functions,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid ABI source.",
      functionCount: 0,
    };
  }
}

function toJsonSafeValue(value: unknown): JsonSafeValue {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonSafeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonSafeValue(item),
      ])
    );
  }

  return null;
}

function findFunctionForSelector(abi: Abi, data: Hex) {
  const selector = data.slice(0, 10).toLowerCase();
  return getAbiFunctions(abi).find(
    (item) => toFunctionSelector(item).toLowerCase() === selector
  );
}

export function decodeSafeCalldataWithCustomAbis(
  data: string | null | undefined,
  customAbis: SafeCustomAbiEntry[]
): DecodedSafeCalldata | null {
  if (!data || !/^0x[0-9a-fA-F]{8}/.test(data)) {
    return null;
  }

  for (const customAbi of customAbis) {
    if (!customAbi.enabled) {
      continue;
    }

    const parsed = parseCustomAbiSource(customAbi.source);
    if (!parsed.ok) {
      continue;
    }

    try {
      const hexData = data as Hex;
      const decoded = decodeFunctionData({
        abi: parsed.abi,
        data: hexData,
      });
      const abiFunction = findFunctionForSelector(parsed.abi, hexData);
      if (!abiFunction) {
        continue;
      }

      const args = Array.isArray(decoded.args) ? decoded.args : [];

      return {
        method: decoded.functionName,
        parameters: abiFunction.inputs.map((input, index) => ({
          name: input.name || `arg${index}`,
          type: input.type,
          value: toJsonSafeValue(args[index]),
        })),
      };
    } catch {
      continue;
    }
  }

  return null;
}
