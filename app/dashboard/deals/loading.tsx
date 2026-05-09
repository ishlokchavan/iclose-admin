export default function DealsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-3 w-24 rounded-full bg-mist mb-3" />
          <div className="h-7 w-24 rounded-lg bg-mist" />
        </div>
        <div className="h-10 w-28 rounded-full bg-mist" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-mist p-4 flex flex-col gap-2">
            <div className="h-3 w-16 rounded-full bg-hairline" />
            <div className="h-6 w-12 rounded-lg bg-hairline" />
          </div>
        ))}
      </div>
      <div className="card-surface overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-hairline last:border-0">
            {[...Array(6)].map((_, j) => <div key={j} className="h-3.5 rounded-full bg-mist" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
