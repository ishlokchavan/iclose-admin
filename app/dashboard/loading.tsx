export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div>
        <div className="h-3 w-20 rounded-full bg-mist mb-3" />
        <div className="h-7 w-48 rounded-lg bg-mist" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-surface p-6 flex flex-col gap-4">
            <div className="h-3 w-24 rounded-full bg-mist" />
            <div className="h-8 w-16 rounded-lg bg-mist" />
          </div>
        ))}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <div className="h-4 w-36 rounded-full bg-mist" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-hairline last:border-0">
            <div className="h-9 w-9 rounded-full bg-mist shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded-full bg-mist" />
              <div className="h-3 w-20 rounded-full bg-mist/60" />
            </div>
            <div className="h-5 w-16 rounded-full bg-mist" />
            <div className="h-3 w-20 rounded-full bg-mist" />
          </div>
        ))}
      </div>
    </div>
  )
}
