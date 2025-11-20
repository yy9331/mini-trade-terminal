import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EnhancedToken } from "@codex-data/sdk/dist/sdk/generated/graphql";
import { useBalance } from "@/hooks/use-balance";
import { useTrade } from "@/hooks/use-trade";
import { confirmTransaction, createConnection, createKeypair, sendTransaction, signTransaction } from "@/lib/solana";
import { Maximize2 } from "lucide-react";

interface TradingPanelProps {
  token: EnhancedToken;
  onOpenWindow?: () => void;
}

export function TradingPanel({ token, onOpenWindow }: TradingPanelProps) {
  const tokenSymbol = token.symbol;
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellPercentage, setSellPercentage] = useState("");
  
  const { nativeBalance: solanaBalance, tokenBalance, tokenAtomicBalance, loading, refreshBalance } = useBalance(token.address, Number(token.decimals), 9, Number(token.networkId));
  const { createTransaction } = useTrade(token.address, tokenAtomicBalance);

  const keypair = createKeypair(import.meta.env.VITE_SOLANA_PRIVATE_KEY);
  const connection = createConnection();

  const handleTrade = useCallback(async () => {
    const toastId = toast.loading("Submitting trade request...");
    try {
      const transaction =
        await createTransaction({ 
          direction: tradeMode, 
          value: tradeMode === "buy" ? parseFloat(buyAmount) : parseFloat(sellPercentage), 
          signer: keypair.publicKey 
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
      toast.success(`Trade successful! TX: ${signature.slice(0, 8)}...`, { id: toastId }); 

      // Refresh balance after 1 second
      setTimeout(refreshBalance, 1000);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }, [tradeMode, buyAmount, sellPercentage, createTransaction, keypair, connection, refreshBalance]);

  const solBuyAmountPresets = [0.0001, 0.001, 0.01, 0.1];
  const percentagePresets = [25, 50, 75, 100];

  if (!import.meta.env.VITE_SOLANA_PRIVATE_KEY || !import.meta.env.VITE_HELIUS_RPC_URL || !import.meta.env.VITE_JUPITER_REFERRAL_ACCOUNT) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade {tokenSymbol || "Token"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Trading requires VITE_SOLANA_PRIVATE_KEY, VITE_HELIUS_RPC_URL and VITE_JUPITER_REFERRAL_ACCOUNT to be configured in environment variables.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trade {tokenSymbol || "Token"}</CardTitle>
          <div className="flex items-center gap-2">
            {onOpenWindow && (
              <button
                onClick={onOpenWindow}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                aria-label="Open in draggable window"
                title="Open in draggable window"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(keypair.publicKey.toBase58());
                toast.success("Wallet address copied!");
              }}
              className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors cursor-pointer"
            >
              {keypair.publicKey.toBase58().slice(0, 4)}...{keypair.publicKey.toBase58().slice(-4)}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">SOL Balance:</span>
          <span className="font-semibold">{solanaBalance.toFixed(4)} SOL</span>
        </div>

        {tokenSymbol && (
          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">{tokenSymbol} Balance:</span>
            <span className="font-semibold">{tokenBalance.toLocaleString()} {tokenSymbol}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setTradeMode("buy")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
              tradeMode === "buy"
                ? "bg-green-500/20 text-green-500 border border-green-500/50"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeMode("sell")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
              tradeMode === "sell"
                ? "bg-red-500/20 text-red-500 border border-red-500/50"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            Sell
          </button>
        </div>

        {tradeMode === "buy" ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Amount in SOL</label>
            
            {/* One-click preset buttons */}
            <div className="grid grid-cols-4 gap-2">
              {solBuyAmountPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    // Toggle: if already selected, deselect; otherwise select
                    if (buyAmount === preset.toString()) {
                      setBuyAmount("");
                    } else {
                      setBuyAmount(preset.toString());
                    }
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                    buyAmount === preset.toString()
                      ? "bg-green-500/20 text-green-500 border-2 border-green-500/50"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-2 border-transparent"
                  )}
                >
                  {preset} SOL
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="Enter custom amount"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Available: {solanaBalance.toFixed(4)} SOL
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Percentage of Token Balance</label>
            
            {/* One-click percentage buttons */}
            <div className="grid grid-cols-4 gap-2">
              {percentagePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    // Toggle: if already selected, deselect; otherwise select
                    if (sellPercentage === preset.toString()) {
                      setSellPercentage("");
                    } else {
                      setSellPercentage(preset.toString());
                    }
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                    sellPercentage === preset.toString()
                      ? "bg-red-500/20 text-red-500 border-2 border-red-500/50"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-2 border-transparent"
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Custom percentage input */}
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="Enter custom percentage"
                value={sellPercentage}
                onChange={(e) => setSellPercentage(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full"
              />
              {sellPercentage && tokenBalance > 0 && (
                <div className="text-xs text-muted-foreground">
                  Selling: {((tokenBalance * parseFloat(sellPercentage)) / 100).toLocaleString()} {tokenSymbol}
                </div>
              )}
            </div>
          </div>
        )}

        {/* One-click trade button */}
        <button
          onClick={handleTrade}
          disabled={loading ||
            (tradeMode === "buy" && (!buyAmount || parseFloat(buyAmount) <= 0 || parseFloat(buyAmount) > solanaBalance)) ||
            (tradeMode === "sell" && (!sellPercentage || parseFloat(sellPercentage) <= 0 || parseFloat(sellPercentage) > 100 || tokenBalance <= 0))
          }
          className={cn(
            "w-full py-3.5 px-4 rounded-lg font-bold text-base transition-all shadow-lg",
            tradeMode === "buy"
              ? "bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/30 disabled:text-green-500/50 disabled:shadow-none"
              : "bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/30 disabled:text-red-500/50 disabled:shadow-none",
            "disabled:cursor-not-allowed active:scale-95"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Processing...
            </span>
          ) : (
            `One-Click ${tradeMode === "buy" ? "Buy" : "Sell"} ${tokenSymbol || "Token"}`
          )}
        </button>
      </CardContent>
    </Card>
  );
}