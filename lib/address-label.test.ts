import { beforeEach, describe, expect, it } from "vitest";

import { addressLabelStorage } from "@/lib/storage";
import type { AddressLabel } from "@/types/address-label";

describe("addressLabelStorage", () => {
  const mockAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const mockLabel: AddressLabel = {
    address: mockAddress,
    label: "Test Wallet",
    description: "My test wallet",
    color: "#3b82f6",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe("addLabel", () => {
    it("should add a new label", () => {
      addressLabelStorage.addLabel(mockLabel);
      const labels = addressLabelStorage.getLabels();
      expect(labels).toHaveLength(1);
      expect(labels[0].address).toBe(mockAddress);
      expect(labels[0].label).toBe("Test Wallet");
    });

    it("should not add duplicate labels", () => {
      addressLabelStorage.addLabel(mockLabel);
      addressLabelStorage.addLabel(mockLabel);
      const labels = addressLabelStorage.getLabels();
      expect(labels).toHaveLength(1);
    });
  });

  describe("getLabel", () => {
    it("should retrieve a label by address", () => {
      addressLabelStorage.addLabel(mockLabel);
      const label = addressLabelStorage.getLabel(mockAddress);
      expect(label).toBeDefined();
      expect(label?.label).toBe("Test Wallet");
    });

    it("should return undefined for non-existent address", () => {
      const label = addressLabelStorage.getLabel("nonexistent");
      expect(label).toBeUndefined();
    });
  });

  describe("updateLabel", () => {
    it("should update an existing label", () => {
      addressLabelStorage.addLabel(mockLabel);
      addressLabelStorage.updateLabel(mockAddress, {
        label: "Updated Label",
        description: "Updated description",
      });

      const label = addressLabelStorage.getLabel(mockAddress);
      expect(label?.label).toBe("Updated Label");
      expect(label?.description).toBe("Updated description");
    });
  });

  describe("deleteLabel", () => {
    it("should delete a label", () => {
      addressLabelStorage.addLabel(mockLabel);
      addressLabelStorage.deleteLabel(mockAddress);
      const labels = addressLabelStorage.getLabels();
      expect(labels).toHaveLength(0);
    });
  });

  describe("saveLabels and getLabels", () => {
    it("should save and retrieve multiple labels", () => {
      const labels: AddressLabel[] = [
        mockLabel,
        {
          address: "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
          label: "Second Wallet",
          color: "#8b5cf6",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      addressLabelStorage.saveLabels(labels);
      const retrieved = addressLabelStorage.getLabels();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].label).toBe("Test Wallet");
      expect(retrieved[1].label).toBe("Second Wallet");
    });
  });
});
