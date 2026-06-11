import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '1h';

export interface TokenPayload {
  userId: string;
  role: string;
}

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    '';

  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is not set');
  }

  return secret;
}

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
};

export const generateRefreshToken = () => {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  );
};
