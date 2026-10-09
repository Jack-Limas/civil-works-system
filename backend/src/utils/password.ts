import bcrypt from "bcrypt";
import crypto from "crypto";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const BCRYPT_ROUNDS = 10;

/** No 0/O, 1/l/I: the admin has to read it out or type it on a phone. */
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "#$%&*+-?@";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;
const TEMPORARY_LENGTH = 14;

function pick(alphabet: string) {
  // crypto.randomInt is uniform (no modulo bias), unlike Math.random
  return alphabet[crypto.randomInt(alphabet.length)];
}

/**
 * Random temporary password with at least one character of each class.
 * It is returned once to the admin and never stored in clear or logged.
 */
export function generateTemporaryPassword(): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < TEMPORARY_LENGTH) chars.push(pick(ALL));
  // Fisher–Yates shuffle so the guaranteed classes are not always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
