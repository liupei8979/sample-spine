interface DebugPanelProps {
  debugInfo: string;
}

export function DebugPanel({ debugInfo }: DebugPanelProps) {
  return (
    <div className="debug-info">
      <h3>디버그 정보</h3>
      <pre>{debugInfo || "로그 없음"}</pre>
    </div>
  );
}
