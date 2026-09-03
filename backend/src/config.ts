import 'dotenv/config';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

  stellar: {
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    rpcUrl: process.env.STELLAR_RPC_URL ?? '',
    horizonUrl: process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    treasuryPublicKey: process.env.STELLAR_TREASURY_PUBLIC_KEY ?? '',
    treasurySecretKey: process.env.STELLAR_TREASURY_SECRET_KEY ?? '',
  },

  oracle: {
    privateKey: process.env.ORACLE_PRIVATE_KEY ?? '',
    publicKey: process.env.ORACLE_PUBLIC_KEY ?? '',
  },

  fundingProvider: (process.env.FUNDING_PROVIDER ?? 'mock') as 'mock' | 'previ',
  previ: {
    apiUrl: process.env.PREVI_API_URL ?? '',
    apiKey: process.env.PREVI_API_KEY ?? '',
    apiSecret: process.env.PREVI_API_SECRET ?? '',
  },

  mockMode: (process.env.MOCK_MODE ?? 'true') === 'true',

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
};
