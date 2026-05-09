export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-3 w-20 rounded-full bg-mist mb-3" />
        <div className="h-7 w-40 rounded-lg bg-mist" />
      </div>
      <div className="card-surface h-48 rounded-xl bg-mist/50" />
    </div>
  )
}
