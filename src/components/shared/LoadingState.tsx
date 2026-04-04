interface LoadingStateProps {
  message?: string;
  rows?: number;
}

const LoadingState = ({ message = "Loading...", rows = 5 }: LoadingStateProps) => (
  <div className="rounded-xl border border-border bg-card shadow-sm p-6">
    <div className="flex flex-col items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export default LoadingState;
