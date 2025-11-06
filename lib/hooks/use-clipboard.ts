import { useState } from "react";
import { toast } from "sonner";

export function useClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async (text: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(successMessage || "Copied to clipboard");

      setTimeout(() => {
        setIsCopied(false);
      }, timeout);

      return true;
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
      return false;
    }
  };

  return { copy, isCopied };
}
