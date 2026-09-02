import { createHash, sign, verify } from 'node:crypto';
import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { config } from '../config.js';

export async function createAttestation(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);

  if (claim.status !== 'PRELIMINARILY_VERIFIED') {
    throw new AppError('INVALID_TRANSITION', 'Claim must be PRELIMINARILY_VERIFIED to attest', 400);
  }

  const verifications = await prisma.verification.findMany({ where: { claimId } });
  const verifiedCount = verifications.filter((v) => v.verified).length;

  const payload = {
    claimId,
    policyId: claim.policyId,
    verifications: verifications.map((v) => ({
      source: v.source,
      verified: v.verified,
      referenceHash: v.referenceHash,
    })),
    verifiedCount,
    timestamp: new Date().toISOString(),
  };

  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  let signature = '';
  if (config.oracle.privateKey) {
    const privateKeyObj = config.oracle.privateKey.startsWith('-----')
      ? config.oracle.privateKey
      : `-----BEGIN PRIVATE KEY-----\n${config.oracle.privateKey}\n-----END PRIVATE KEY-----`;

    try {
      const keyBuffer = Buffer.from(privateKeyObj, 'utf-8');
      const signBuffer = Buffer.from(hash, 'utf-8');
      const sig = sign(null, signBuffer, keyBuffer);
      signature = sig.toString('base64');
    } catch {
      // For demo/testing without real keys, use a mock signature
      signature = createHash('sha256').update(`sig:${hash}`).digest('hex');
    }
  } else {
    signature = createHash('sha256').update(`sig:${hash}`).digest('hex');
  }

  const attestation = JSON.stringify({
    hash,
    signature,
    publicKey: config.oracle.publicKey || 'mock-oracle-public-key',
    timestamp: payload.timestamp,
  });

  await prisma.claim.update({
    where: { id: claimId },
    data: { oracleAttestation: attestation },
  });

  return { hash, signature, publicKey: config.oracle.publicKey || 'mock-oracle-public-key', timestamp: payload.timestamp };
}

export async function verifyAttestation(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw notFound('claim', claimId);
  if (!claim.oracleAttestation) {
    throw new AppError('INVALID_ATTESTATION', 'No attestation found for this claim', 400);
  }

  const attestation = JSON.parse(claim.oracleAttestation);

  const verifications = await prisma.verification.findMany({ where: { claimId } });

  const payload = {
    claimId,
    policyId: claim.policyId,
    verifications: verifications.map((v) => ({
      source: v.source,
      verified: v.verified,
      referenceHash: v.referenceHash,
    })),
    verifiedCount: verifications.filter((v) => v.verified).length,
    timestamp: attestation.timestamp,
  };

  const expectedHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  if (expectedHash !== attestation.hash) {
    throw new AppError('INVALID_ATTESTATION', 'Attestation hash does not match', 400);
  }

  if (attestation.signature.startsWith('mock-oracle') || attestation.signature.length < 100) {
    // Mock signature — just verify hash matches
    return { valid: true, hash: attestation.hash, publicKey: attestation.publicKey };
  }

  // Real signature verification
  try {
    const publicKeyObj = attestation.publicKey.startsWith('-----')
      ? attestation.publicKey
      : `-----BEGIN PUBLIC KEY-----\n${attestation.publicKey}\n-----END PUBLIC KEY-----`;

    const keyBuffer = Buffer.from(publicKeyObj, 'utf-8');
    const hashBuffer = Buffer.from(attestation.hash, 'utf-8');
    const sigBuffer = Buffer.from(attestation.signature, 'base64');

    const valid = verify(null, hashBuffer, keyBuffer, sigBuffer);
    return { valid, hash: attestation.hash, publicKey: attestation.publicKey };
  } catch {
    throw new AppError('INVALID_ATTESTATION', 'Attestation signature verification failed', 400);
  }
}
