import { Horizon, Keypair, Networks } from '@stellar/stellar-sdk';

let server: Horizon.Server | null = null;

export function getServer(): Horizon.Server {
  if (!server) {
    const url = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    server = new Horizon.Server(url);
  }
  return server;
}

export function resetServer(): void {
  server = null;
}

export function getNetworkPassphrase(): string {
  return Networks.TESTNET;
}

export function getTreasuryKeypair(): Keypair {
  const secret = process.env.STELLAR_TREASURY_SECRET_KEY;
  if (!secret) {
    throw new Error('STELLAR_TREASURY_SECRET_KEY is required');
  }
  return Keypair.fromSecret(secret);
}

export function createKeypair(): Keypair {
  return Keypair.random();
}

export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(friendbotUrl);

      if (!response.ok) {
        const text = await response.text();
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Friendbot funding failed: ${response.status} - ${text}`);
      }

      const data = await response.json() as any;
      if (data.successful === false) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error('Friendbot funding was not successful');
      }

      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

export async function fundTestnetAccountWithRetry(publicKey: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fundTestnetAccount(publicKey);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
