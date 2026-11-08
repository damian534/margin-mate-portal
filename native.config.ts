/** Store builds bundle dist; opt into the hosted preview only for device development. */
export function nativeServerConfig(liveReload: boolean) {
  return liveReload
    ? {
        url: 'https://f48756f9-dddd-4894-8139-f6867c449221.lovableproject.com?forceHideBadge=true',
        cleartext: true,
      }
    : undefined;
}