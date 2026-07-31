// Converts the user's local reminder hour to the UTC hour stored server-side.

export const localToUtcHour = (localHour: number): number => {
  const d = new Date();
  d.setHours(localHour, 0, 0, 0);

  return d.getUTCHours();
};
