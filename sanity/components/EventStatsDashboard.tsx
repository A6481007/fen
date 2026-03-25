"use client";

import React, { useEffect, useState } from "react";
import { useClient } from "sanity";
import { Badge, Box, Card, Flex, Grid, Stack, Text } from "@sanity/ui";
import { apiVersion } from "../env";

type EventListItem = {
  _id: string;
  title?: string | null;
  date?: string | null;
  maxAttendees?: number | null;
  attendeeCount: number;
};

type RsvpListItem = {
  _id: string;
  name?: string | null;
  status?: string | null;
  eventTitle?: string | null;
  submittedAt?: string | null;
};

type EventStats = {
  upcomingEvents: number;
  registrationsThisMonth: number;
  eventsAtCapacity: number;
  pendingRsvps: number;
  nextEvents: EventListItem[];
  recentRsvps: RsvpListItem[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "No date";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "No date"
    : parsed.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const rsvpTone = (status?: string | null) => {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return "positive" as const;
    case "waitlisted":
      return "caution" as const;
    case "cancelled":
    case "archived":
      return "critical" as const;
    default:
      return "primary" as const;
  }
};

export default function EventStatsDashboard() {
  const client = useClient({ apiVersion });
  const [stats, setStats] = useState<EventStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      try {
        const result = await client.fetch<EventStats>(
          // Groq keeps the counts and quick lists in one round trip.
          `
          {
            "upcomingEvents": count(
              *[
                _type == "event" &&
                (coalesce(statusOverride, status) == "upcoming" || date >= now())
              ]
            ),
            "registrationsThisMonth": count(
              *[
                _type == "eventRsvp" &&
                coalesce(submittedAt, _createdAt) >= $monthStart
              ]
            ),
            "eventsAtCapacity": count(
              *[
                _type == "event" &&
                defined(maxAttendees) &&
                maxAttendees > 0 &&
                count(attendees) >= maxAttendees
              ]
            ),
            "pendingRsvps": count(
              *[
                _type == "eventRsvp" &&
                status in ["new", "waitlisted"]
              ]
            ),
            "nextEvents": *[
              _type == "event" && date >= now()
            ] | order(date asc) [0...3]{
              _id,
              title,
              date,
              maxAttendees,
              "attendeeCount": coalesce(count(attendees), 0)
            },
            "recentRsvps": *[_type == "eventRsvp"] | order(coalesce(submittedAt, _createdAt) desc) [0...5]{
              _id,
              name,
              status,
              "eventTitle": coalesce(event->title, eventSlug),
              "submittedAt": coalesce(submittedAt, _createdAt)
            }
          }
        `,
          { monthStart: monthStart.toISOString() }
        );

        if (!cancelled) {
          setStats(result);
        }
      } catch (err) {
        console.error("Failed to load event stats", err);
        if (!cancelled) {
          setError("Unable to load event statistics right now.");
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [client]);

  if (error) {
    return (
      <Card padding={4} radius={3} shadow={1} tone="critical">
        <Text weight="semibold">Event stats</Text>
        <Text muted size={1}>
          {error}
        </Text>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card padding={4} radius={3} shadow={1}>
        <Text>Loading event stats...</Text>
      </Card>
    );
  }

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Flex justify="space-between" align="center">
          <Text size={3} weight="semibold">
            Event stats
          </Text>
          <Badge tone="primary" padding={2}>
            Live
          </Badge>
        </Flex>

        <Grid columns={[1, 2, 4]} gap={3}>
          <Card padding={4} radius={3} shadow={1} tone="primary">
            <Stack space={2}>
              <Text muted size={1}>
                Upcoming events
              </Text>
              <Text size={4} weight="bold">
                {stats.upcomingEvents}
              </Text>
            </Stack>
          </Card>

          <Card padding={4} radius={3} shadow={1} tone="positive">
            <Stack space={2}>
              <Text muted size={1}>
                Registrations this month
              </Text>
              <Text size={4} weight="bold">
                {stats.registrationsThisMonth}
              </Text>
              <Badge tone="primary">
                {new Date().toLocaleString(undefined, { month: "long" })}
              </Badge>
            </Stack>
          </Card>

          <Card padding={4} radius={3} shadow={1} tone="caution">
            <Stack space={2}>
              <Text muted size={1}>
                Events at capacity
              </Text>
              <Text size={4} weight="bold">
                {stats.eventsAtCapacity}
              </Text>
            </Stack>
          </Card>

          <Card padding={4} radius={3} shadow={1} tone="default">
            <Stack space={2}>
              <Text muted size={1}>
                Pending RSVPs
              </Text>
              <Text size={4} weight="bold">
                {stats.pendingRsvps}
              </Text>
              <Badge tone="caution">New & waitlisted</Badge>
            </Stack>
          </Card>
        </Grid>

        <Grid columns={[1, 1, 2]} gap={4}>
          <Card padding={4} radius={3} shadow={1}>
            <Stack space={3}>
              <Text size={2} weight="semibold">
                Next 3 upcoming events
              </Text>
              <Stack space={2}>
                {stats.nextEvents.length === 0 ? (
                  <Text muted size={1}>
                    No upcoming events scheduled.
                  </Text>
                ) : (
                  stats.nextEvents.map((event) => (
                    <Card key={event._id} padding={3} radius={2} shadow={1} tone="transparent">
                      <Flex align="center" justify="space-between" gap={3}>
                        <Stack space={1}>
                          <Text weight="semibold">{event.title || "Untitled event"}</Text>
                          <Text size={1} muted>
                            {formatDate(event.date)}
                          </Text>
                        </Stack>
                        <Stack space={1} style={{ minWidth: 140, alignItems: "flex-end" }}>
                          <Badge tone="primary">
                            {event.attendeeCount}
                            {typeof event.maxAttendees === "number"
                              ? ` / ${event.maxAttendees}`
                              : ""}{" "}
                            registered
                          </Badge>
                          {typeof event.maxAttendees === "number" && event.maxAttendees > 0 ? (
                            <Text size={1} muted>
                              {Math.min(
                                100,
                                Math.round((event.attendeeCount / event.maxAttendees) * 100)
                              )}
                              % full
                            </Text>
                          ) : null}
                        </Stack>
                      </Flex>
                    </Card>
                  ))
                )}
              </Stack>
            </Stack>
          </Card>

          <Card padding={4} radius={3} shadow={1}>
            <Stack space={3}>
              <Text size={2} weight="semibold">
                Recent RSVPs
              </Text>
              <Stack space={2}>
                {stats.recentRsvps.length === 0 ? (
                  <Text muted size={1}>
                    No RSVPs yet.
                  </Text>
                ) : (
                  stats.recentRsvps.map((rsvp) => (
                    <Card key={rsvp._id} padding={3} radius={2} shadow={1} tone="transparent">
                      <Flex align="center" justify="space-between" gap={3}>
                        <Stack space={1}>
                          <Text weight="semibold">{rsvp.name || "Unnamed attendee"}</Text>
                          <Text size={1} muted>
                            {rsvp.eventTitle || "No event linked"}
                          </Text>
                          <Text size={1} muted>
                            {formatDate(rsvp.submittedAt)}
                          </Text>
                        </Stack>
                        <Badge mode="outline" tone={rsvpTone(rsvp.status)}>
                          {rsvp.status || "new"}
                        </Badge>
                      </Flex>
                    </Card>
                  ))
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Stack>
    </Box>
  );
}
