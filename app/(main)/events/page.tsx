import { EventManager } from "@/components/ui/event-manager"

export default function EventsPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-1 items-center justify-center">
      <div className="flex h-[90%] w-[90%] flex-col">
        <EventManager />
      </div>
    </div>
  )
}
