"use client"

import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar"

const dummyEvents = [
  {
    day: new Date("2026-07-01"),
    events: [
      {
        id: 1,
        name: "Q3 Kickoff Meeting",
        time: "10:00 AM",
        datetime: "2026-07-01T10:00",
      },
    ],
  },
  {
    day: new Date("2026-07-07"),
    events: [
      {
        id: 2,
        name: "Creator Onboarding",
        time: "2:00 PM",
        datetime: "2026-07-07T14:00",
      },
      {
        id: 3,
        name: "Brand Campaign Review",
        time: "4:00 PM",
        datetime: "2026-07-07T16:00",
      },
    ],
  },
  {
    day: new Date("2026-07-14"),
    events: [
      {
        id: 4,
        name: "Deal Negotiation – TechCorp",
        time: "11:00 AM",
        datetime: "2026-07-14T11:00",
      },
      {
        id: 5,
        name: "Content Shoot Day",
        time: "9:00 AM",
        datetime: "2026-07-14T09:00",
      },
      {
        id: 6,
        name: "Team Sync",
        time: "5:00 PM",
        datetime: "2026-07-14T17:00",
      },
    ],
  },
  {
    day: new Date("2026-07-21"),
    events: [
      {
        id: 7,
        name: "Influencer Summit",
        time: "10:00 AM",
        datetime: "2026-07-21T10:00",
      },
    ],
  },
  {
    day: new Date("2026-07-28"),
    events: [
      {
        id: 8,
        name: "Monthly Performance Review",
        time: "3:00 PM",
        datetime: "2026-07-28T15:00",
      },
      {
        id: 9,
        name: "Sponsor Debrief",
        time: "5:00 PM",
        datetime: "2026-07-28T17:00",
      },
    ],
  },
]

export default function EventsPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-1 flex-col">
      <FullScreenCalendar data={dummyEvents} />
    </div>
  )
}
