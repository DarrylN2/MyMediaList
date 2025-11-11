export default function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Media Detail</h1>
      <div className="rounded-2xl border p-6">
        <p className="text-muted-foreground">Media details will go here</p>
      </div>
    </div>
  )
}
