import { Codex } from "@codex-data/sdk";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { TokenChart, ChartDataPoint } from "@/components/TokenChart";
import { TokenSidebar } from "@/components/TokenSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedToken } from "@codex-data/sdk/dist/sdk/generated/graphql";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";

type TokenEvent = {
  id: string;
  timestamp: number;
  transactionHash: string;
  eventDisplayType?: string | null;
  amountUsd?: number | null;
  uniqueId?: string;
};

export default function TokenPage() {
  const { networkId, tokenId } = useParams<{ networkId: string; tokenId: string }>();
  const networkIdNum = parseInt(networkId || '', 10);

  const [details, setDetails] = useState<EnhancedToken | undefined>(undefined);
  const [bars, setBars] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isNaN(networkIdNum) || !tokenId) {
      setError("Invalid Network or Token ID");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const apiKey = import.meta.env.VITE_CODEX_API_KEY;
      if (!apiKey) {
        console.warn("VITE_CODEX_API_KEY not set.");
      }
      const codexClient = new Codex(apiKey || '');

      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 1 * 24 * 60 * 60;
      const symbolId = `${tokenId}:${networkIdNum}`;

      try {
        const results = await Promise.allSettled([
          codexClient.queries.token({ input: { networkId: networkIdNum, address: tokenId } }),
          codexClient.queries.getBars({
            symbol: symbolId,
            from: oneDayAgo,
            to: now,
            resolution: '30'
          }),
          codexClient.queries.getTokenEvents({ query: { networkId: networkIdNum, address: tokenId }, limit: 50 }),
        ]);

        const detailsResult = results[0];
        const barsResult = results[1];
        const eventsResult = results[2];

        if (detailsResult.status === 'fulfilled') {
          setDetails(detailsResult.value.token);
        }

        if (barsResult.status === 'fulfilled') {
          const b = barsResult.value.getBars;
          if (b?.t && b?.c) {
            const chartData = b.t.map((time: number, index: number) => ({
              time: time,
              open: b.o?.[index],
              high: b.h?.[index],
              low: b.l?.[index],
              close: b.c?.[index],
            }));
            setBars(chartData);
          }
        }

        if (eventsResult.status === 'fulfilled' && eventsResult.value.getTokenEvents?.items) {
          const tokenEvents = eventsResult.value.getTokenEvents.items
            .filter(ev => ev != null)
            .map((ev, index) => {
              const decimals = details?.decimals ?? 18;
              const swapValue = parseFloat(ev.token0SwapValueUsd || '0');
              const amount0 = parseFloat(ev.data?.amount0 || '0');
              const calculatedAmountUsd = swapValue * Math.abs(amount0 / (10 ** decimals));

              return {
                id: ev.id,
                timestamp: ev.timestamp,
                uniqueId: `${ev.id}-${ev.blockNumber || 0}-${ev.transactionIndex || 0}-${ev.logIndex || 0}-${index}`,
                transactionHash: ev.transactionHash,
                eventDisplayType: ev.eventDisplayType,
                amountUsd: calculatedAmountUsd,
              };
            });
          setEvents(tokenEvents);
        }
      } catch (err) {
        console.error("Error fetching token data:", err);
        setError("Failed to load token data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [networkIdNum, tokenId, details?.decimals]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center p-6 md:p-12">
        <p>Loading token data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Link to="/" className="mt-4 hover:underline">Go back home</Link>
      </main>
    );
  }

  const tokenName = details?.name || tokenId;
  const tokenSymbol = details?.symbol ? `(${details.symbol})` : '';

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 space-y-6">
      <div className="w-full max-w-6xl flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold truncate pr-4">
          {tokenName} {tokenSymbol}
        </h1>
        <Link to={`/networks/${networkId}`} className="text-sm hover:underline whitespace-nowrap">
          &lt; Back to Network
        </Link>
      </div>

      {/* 外层容器负责定位按钮，不占用 grid 列 */}
      <div className="w-full max-w-6xl relative">
        <div className={cn(
          "grid gap-6 transition-all duration-300",
          isSidebarCollapsed ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
        )}>
          <div className={cn(
            "space-y-6 transition-all duration-300",
            !isSidebarCollapsed && "lg:col-span-2"
          )}>
            <div className="relative">
              {isSidebarCollapsed && details && (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden lg:flex absolute -top-2 -right-2 p-2 rounded-full bg-background border border-border hover:bg-muted transition-all duration-300 shadow-sm items-center justify-center z-20 cursor-pointer hover:scale-110 active:scale-95 animate-in fade-in slide-in-from-right-2"
                  aria-label="expand-panel"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
                </button>
              )}
              <Suspense fallback={<Card><CardHeader><CardTitle>Price Chart</CardTitle></CardHeader><CardContent><p>Loading chart...</p></CardContent></Card>}>
                <TokenChart data={bars} title={`${tokenSymbol || 'Token'} Price Chart`} />
              </Suspense>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Value (USD)</TableHead>
                        <TableHead>Tx Hash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.uniqueId || event.id}>
                          <TableCell>{event.eventDisplayType || 'N/A'}</TableCell>
                          <TableCell>{new Date(event.timestamp * 1000).toLocaleString()}</TableCell>
                          <TableCell>{event.amountUsd ? `$${event.amountUsd.toFixed(2)}` : 'N/A'}</TableCell>
                          <TableCell className="truncate">
                            <span title={event.transactionHash}>{event.transactionHash.substring(0, 8)}...</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No recent transaction data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {!isSidebarCollapsed && details && (
            <div className="hidden lg:block lg:col-span-1 relative">
              {details && (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="absolute -top-2 -right-2 p-2 rounded-full bg-background border border-border hover:bg-muted transition-all duration-300 shadow-sm items-center justify-center z-20 cursor-pointer hover:scale-110 active:scale-95 animate-in fade-in slide-in-from-left-2"
                  aria-label="folding-panel"
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-300" />
                </button>
              )}
              <TokenSidebar
                token={details}
                isCollapsed={false}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}