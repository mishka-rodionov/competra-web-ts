export function Loading() {
  return (
    <div className="flex justify-center p-4">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
        role="status"
        aria-label="Загрузка"
      />
    </div>
  )
}
