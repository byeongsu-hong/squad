import { encodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import {
  decodeSafeCalldataWithCustomAbis,
  parseCustomAbiSource,
} from "@/lib/safe-custom-abi";

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [],
  },
] as const;

describe("custom Safe ABI helpers", () => {
  it("parses a JSON ABI array and counts function entries", () => {
    const result = parseCustomAbiSource(JSON.stringify(erc20Abi));

    expect(result.ok).toBe(true);
    expect(result.functionCount).toBe(1);
    expect(result.format).toBe("json");
  });

  it("parses an artifact object that contains an abi property", () => {
    const result = parseCustomAbiSource(
      JSON.stringify({ contractName: "Token", abi: erc20Abi })
    );

    expect(result.ok).toBe(true);
    expect(result.functionCount).toBe(1);
    expect(result.format).toBe("artifact");
  });

  it("parses newline-separated human-readable function signatures", () => {
    const result = parseCustomAbiSource(`
      transfer(address to, uint256 amount)
      approve(address spender, uint256 amount)
    `);

    expect(result.ok).toBe(true);
    expect(result.functionCount).toBe(2);
    expect(result.format).toBe("human-readable");
  });

  it("reports invalid ABI source without throwing", () => {
    const result = parseCustomAbiSource("not valid abi source");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ABI/i);
  });

  it("decodes calldata with the first enabled matching ABI and returns JSON-safe bigint args", () => {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x1111111111111111111111111111111111111111", 123n],
    });

    const decoded = decodeSafeCalldataWithCustomAbis(data, [
      {
        label: "Disabled ERC20",
        source: JSON.stringify(erc20Abi),
        enabled: false,
      },
      {
        label: "ERC20",
        source: JSON.stringify(erc20Abi),
        enabled: true,
      },
    ]);

    expect(decoded).toEqual({
      method: "transfer",
      parameters: [
        {
          name: "to",
          type: "address",
          value: "0x1111111111111111111111111111111111111111",
        },
        { name: "amount", type: "uint256", value: "123" },
      ],
    });
  });

  it("returns null when no enabled ABI matches the calldata selector", () => {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x1111111111111111111111111111111111111111", 123n],
    });

    expect(
      decodeSafeCalldataWithCustomAbis(data, [
        {
          label: "Different ABI",
          source: "approve(address spender, uint256 amount)",
          enabled: true,
        },
      ])
    ).toBeNull();
  });
});
