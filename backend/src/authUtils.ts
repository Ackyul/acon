import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ITERATIONS_NEW = 600000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-acon-2026';

/**
 * Hashea una contraseña usando PBKDF2 y un salt aleatorio con alto número de iteraciones.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS_NEW, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2:${ITERATIONS_NEW}:${salt}:${hash}`;
}

/**
 * Verifica si una contraseña coincide con el hash almacenado (soporta hashes legacy y nuevos).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length === 4 && parts[0] === 'pbkdf2') {
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    if (isNaN(iterations) || !salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST).toString('hex');
    return hash === originalHash;
  } else if (parts.length === 2) {
    // Hashes legados de 1000 iteraciones
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, KEYLEN, DIGEST).toString('hex');
    return hash === originalHash;
  }
  return false;
}

/**
 * Genera un token JWT (HMAC-SHA256) firmado sin dependencias externas.
 */
export function generateToken(payload: { username: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  // Token expira en 7 días
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verifica y decodifica un token JWT, devolviendo el payload o null si no es válido o está expirado.
 */
export function verifyToken(token: string): { username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
