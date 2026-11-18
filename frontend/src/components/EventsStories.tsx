import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Star, User } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { EmptyDataCard } from "./EmptyDataCard";

export function UpcomingEvents() {
  return (
    <div>
      <SectionHeader title="Upcoming Events" to="/events" />
      <EmptyDataCard title="Welcome — no upcoming events" text="Real events and workshops will appear here." action="Host an event" to="/dashboard?tab=events" />
    </div>
  );
}

export function LatestStories() {
  return (
    <div>
      <SectionHeader title="Latest Startup Stories" to="/stories" />
      <EmptyDataCard title="Welcome — no stories yet" text="Published founder and startup stories will appear here." action="Submit a story" to="/stories?submit=1" />
    </div>
  );
}
