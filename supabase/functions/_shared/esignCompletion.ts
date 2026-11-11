// A declined or missing signer must never count as an all-parties completion.
export function allPartiesSigned(signers: readonly { status: string }[]): boolean {
  return signers.length > 0 && signers.every((signer) => signer.status === "signed");
}