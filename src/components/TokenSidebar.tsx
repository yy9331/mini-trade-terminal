import { TradingPanel } from "@/components/TradingPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EnhancedToken } from "@codex-data/sdk/dist/sdk/generated/graphql";

interface TokenSidebarProps {
  token: EnhancedToken | undefined;
  isCollapsed: boolean;
  onOpenTradingWindow?: () => void;
  hideTradingPanel?: boolean;
}

export function TokenSidebar({ token, isCollapsed, onOpenTradingWindow, hideTradingPanel = false }: TokenSidebarProps) {
  if (!token || isCollapsed) {
    return null;
  }

  // 展开状态：显示完整内容
  return (
    <div className="lg:col-span-1 space-y-6">
      {!hideTradingPanel && (
        <TradingPanel token={token} onOpenWindow={onOpenTradingWindow} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          {token.info?.imageThumbUrl ? (
            <img
              src={token.info.imageThumbUrl}
              alt={`${token.name || 'Token'} icon`}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
              {token.symbol ? token.symbol[0] : 'T'}
            </div>
          )}
          <div>
            <CardTitle>Information</CardTitle>
            {token.symbol && <CardDescription>{token.symbol}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong className="text-muted-foreground">Address:</strong>
            <span className="font-mono block break-all" title={token.address}>
              {token.address}
            </span>
          </p>
          {token.info?.description && (
            <p className="text-sm">
              <strong className="text-muted-foreground">Description:</strong> {token.info.description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

