export const MIN_JUSTIFICATION = 20;

export interface JustificationCheck {
  ok: boolean;
  length: number;
  message: string;
}

/** A reviewer decision needs a written reason of at least 20 characters (ignoring edge spaces). */
export function checkJustification(text: string): JustificationCheck {
  const length = text.trim().length;
  const ok = length >= MIN_JUSTIFICATION;
  const message = ok
    ? `${length} characters`
    : `${length}/${MIN_JUSTIFICATION} characters – ${MIN_JUSTIFICATION - length} more needed`;
  return { ok, length, message };
}
