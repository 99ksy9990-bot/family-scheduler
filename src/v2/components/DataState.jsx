export function DataState({ loading, error, onRetry, children }) {
  if (loading) return <p className="data-message" role="status">가족 일정을 불러오고 있어요…</p>
  if (error) return <div className="data-message error" role="alert"><p>{error}</p><button onClick={onRetry}>다시 시도</button></div>
  return children
}
