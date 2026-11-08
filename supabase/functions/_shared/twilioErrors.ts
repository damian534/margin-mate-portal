export function twilioSendError(status: number, details: string): string {
  if (status === 404 && details.includes("Endpoint is not supported in realm 'au1'")) {
    return 'Text not sent: this Twilio connection uses Australia (AU1), which does not support this messaging endpoint. Update the connection to US1 with credentials created in US1, then test again.';
  }
  return `Twilio could not send the text (${status}). Check your Twilio account and sending number.`;
}