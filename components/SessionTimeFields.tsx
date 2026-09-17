"use client";

import { useMemo, useState } from "react";

function defaultEndForStart(startValue: string) {
  if (!startValue) return "";
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return "";

  const candidate = new Date(start.getTime() + 60 * 60 * 1000);
  const sameDate = candidate.getFullYear() === start.getFullYear()
    && candidate.getMonth() === start.getMonth()
    && candidate.getDate() === start.getDate();

  if (sameDate) return startValue.replace(/T.*/, `T${String(candidate.getHours()).padStart(2, "0")}:${String(candidate.getMinutes()).padStart(2, "0")}`);

  return `${startValue.slice(0, 10)}T23:59`;
}

export function SessionTimeFields() {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const maxEnd = useMemo(() => startsAt ? `${startsAt.slice(0, 10)}T23:59` : undefined, [startsAt]);

  function handleStartChange(value: string) {
    setStartsAt(value);
    setEndsAt(defaultEndForStart(value));
  }

  function handleEndChange(value: string) {
    if (!startsAt) {
      setEndsAt(value);
      return;
    }

    const sameDate = value.slice(0, 10) === startsAt.slice(0, 10);
    if (!sameDate || value <= startsAt) {
      setEndsAt(defaultEndForStart(startsAt));
      return;
    }

    setEndsAt(value);
  }

  return <>
    <label>Starts
      <input
        name="startsAt"
        type="datetime-local"
        value={startsAt}
        onChange={(event) => handleStartChange(event.target.value)}
        required
      />
    </label>
    <label>Ends
      <input
        name="endsAt"
        type="datetime-local"
        value={endsAt}
        min={startsAt || undefined}
        max={maxEnd}
        onChange={(event) => handleEndChange(event.target.value)}
        required
      />
    </label>
  </>;
}
