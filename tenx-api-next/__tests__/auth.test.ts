import { TokenPayload, generateAccessToken, verifyAccessToken } from '../src/lib/auth';

describe('Auth Utilities', () => {
  const secret = 'dF9sK8V4q2Z7P1xW0cYt5LJm3QeR6uN9HkBvTz4A8sD1fG7hJ2kL5pQ0rXyC6wU';

  test('should generate and verify a valid token', () => {
    const payload: TokenPayload = {
      userId: 'test-user-id',
      role: 'Admin Role',
    };

    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded).toMatchObject(payload);
  });

  test('should return null for an invalid token', () => {
    const decoded = verifyAccessToken('invalid-token');
    expect(decoded).toBeNull();
  });
});
