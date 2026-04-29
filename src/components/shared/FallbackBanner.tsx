import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface FallbackBannerProps {
  message?: string;
  onRetry?: () => void;
}

const FallbackBanner = ({
  message = "Couldn't reach the backend. Click retry to try again.",
  onRetry,
}: FallbackBannerProps) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="h-7 gap-1 border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    )}
  </div>
);

export default FallbackBanner;
