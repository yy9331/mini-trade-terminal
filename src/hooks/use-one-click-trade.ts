import { useCallback } from "react";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";
import { confirmTransaction, createConnection, createKeypair, sendTransaction, signTransaction } from "@/lib/solana";

type UseOneClickTradeOptions = {
  tradeMode: "buy" | "sell";
  buyAmount: string;
  sellPercentage: string;
  createTransaction: (params: {
    direction: "buy" | "sell";
    value: number;
    signer: PublicKey;
  }) => Promise<any>;
  refreshBalance: () => void;
};

/**
 * Custom hook for one-click buy/sell trading functionality
 * Handles the complete trade flow: create, sign, send, and confirm transaction
 */
export const useOneClickTrade = ({
  tradeMode,
  buyAmount,
  sellPercentage,
  createTransaction,
  refreshBalance,
}: UseOneClickTradeOptions) => {
  const keypair = createKeypair(import.meta.env.VITE_SOLANA_PRIVATE_KEY);
  const connection = createConnection();

  const handleTrade = useCallback(async () => {
    const toastId = toast.loading("Submitting trade request...");
    try {
      const transaction = await createTransaction({
        direction: tradeMode,
        value:
          tradeMode === "buy"
            ? parseFloat(buyAmount)
            : parseFloat(sellPercentage),
        signer: keypair.publicKey,
      });

      toast.loading("Signing transaction...", { id: toastId });
      const signedTransaction = signTransaction(keypair, transaction);

      toast.loading("Sending transaction...", { id: toastId });
      const signature = await sendTransaction(signedTransaction, connection);

      toast.loading("Confirming transaction...", { id: toastId });
      const confirmation = await confirmTransaction(signature, connection);

      if (confirmation.value.err) {
        throw new Error("Trade failed");
      }
      toast.success(`Trade successful! TX: ${signature.slice(0, 8)}...`, {
        id: toastId,
      });

      // Refresh balance after 1 second
      setTimeout(refreshBalance, 1000);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }, [
    tradeMode,
    buyAmount,
    sellPercentage,
    createTransaction,
    keypair,
    connection,
    refreshBalance,
  ]);

  return {
    handleTrade,
    keypair,
  };
};

