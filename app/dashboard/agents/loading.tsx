export default function AgentsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-3 w-24 rounded-full bg-mist mb-3" />
          <div className="h-7 w-32 rounded-lg bg-mist" />
        </div>
        <div className="h-10 w-28 rounded-full bg-mist" />
      </div>
      <div className="flex gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-mist" />
        ))}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-3 grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-3 w-16 rounded-full bg-mist" />)}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-hairline last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-mist shrink-0" />
              <div className="h-3.5 w-24 rounded-full bg-mist" />
            </div>
            <div className="h-3 w-16 rounded-full bg-mist self-center" />
            <div className="h-5 w-16 rounded-full bg-mist self-center" />
            <div className="h-3 w-16 rounded-full bg-mist self-center" />
            <div className="h-3 w-20 rounded-full bg-mist self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}
