// 0/O and 1/l/I are left out: these ids get read off a screen and typed back in.
const ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export function shortId(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

export const isShortId = (value: string) =>
  value.length === 6 && [...value].every((char) => ALPHABET.includes(char));

// Long enough that guessing one is not worth trying.
export const secretToken = () => shortId(32);
