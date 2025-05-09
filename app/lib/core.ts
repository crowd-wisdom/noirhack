import type { Claim, Message, SignedClaim, SignedClaimWithProof, SignedMessage, SignedMessageWithProof } from "./types";
import { createClaim, createMembership, createMessage } from "./api";
import { generateEphemeralKey, signMessage, verifyMessageSignature, signClaim, verifyClaimSignature } from "./ephemeral-key";
import { initProver } from "./lazy-modules";
import { Providers } from "./providers";
import { createIdentity, saveIdentity } from "./semaphore";

export async function generateKeyPairAndRegister(
  providerName: keyof typeof Providers
) {
  // Initialize prover without await to preload aztec bundle
  initProver();

  // Generate ephemeral key pair and a random salt
  const ephemeralKey = await generateEphemeralKey();

  // Ask the AnonGroup provider to generate a proof
  const provider = Providers[providerName];
  const { anonGroup, proof, proofArgs } = await provider.generateProof(ephemeralKey);

  // create semaphore identity
  const semaphoreIdentity = await createIdentity(ephemeralKey.publicKey.toString())
  saveIdentity(semaphoreIdentity);

  // Send proof to server to create an AnonGroup membership
  await createMembership({
    ephemeralPubkey: ephemeralKey.publicKey.toString(),
    ephemeralPubkeyExpiry: ephemeralKey.expiry,
    semaphoreIdentityCommitment: semaphoreIdentity.commitment.toString(),
    groupId: anonGroup.id,
    provider: providerName,
    proof,
    proofArgs,
    role: "curator" // Default create as curator. Grant validator role by claiming role
  });

  return { anonGroup, ephemeralPubkey: ephemeralKey.publicKey.toString(), proofArgs, semaphoreIdentity };
}

export async function postMessage(message: Message) {
  // Sign the message with the ephemeral key pair
  const { signature, ephemeralPubkey, ephemeralPubkeyExpiry } = await signMessage(message);
  const signedMessage: SignedMessage = {
    ...message,
    signature: signature,
    ephemeralPubkey: ephemeralPubkey,
    ephemeralPubkeyExpiry: ephemeralPubkeyExpiry,
  };

  // Send the signed message to the server
  await createMessage(signedMessage);

  return signedMessage;
}

export async function postClaim(claim: Claim) {
  // Sign the claim with ephemeral key pair
  const { signature, ephemeralPubkey, ephemeralPubkeyExpiry } = await signClaim(claim);
 console.log("signature", signature)
  const signedClaim: SignedClaim = {
    ...claim,
    signature: signature,
    ephemeralPubkey: ephemeralPubkey,
    ephemeralPubkeyExpiry: ephemeralPubkeyExpiry,
  };

  // Send the signed claim to the server
  await createClaim(signedClaim);

  return signedClaim;
  
}

export async function verifyMessage(message: SignedMessageWithProof) {
  try {
    if (new Date(message.timestamp).getTime() < new Date("2025-02-23").getTime()) {
      throw new Error(
        "Messages generated before 2025-02-23 are not verifiable due to major changes in the circuit. " +
        "Future versions of this app will be backward compatible."
      );
    }

    // Verify the message signature (signed with sender's ephemeral pubkey)
    let isValid = await verifyMessageSignature(message);
    if (!isValid) {
      throw new Error("Signature verification failed for the message");
    }

    // Verify the proof that the sender (their ephemeral pubkey) belongs to the AnonGroup
    const provider = Providers[message.anonGroupProvider];
    isValid = await provider.verifyProof(
      message.proof,
      message.anonGroupId,
      message.ephemeralPubkey,
      message.ephemeralPubkeyExpiry,
      message.proofArgs
    );

    return isValid;
  } catch (error) {
    // @ts-expect-error - error is an unknown type
    alert(error.message);
    // @ts-expect-error - error is an unknown type
    throw new Error(error.message);
  }
}

export async function verifyClaim(claim: SignedClaimWithProof) {
  try {
    // Verify the claim signature (signed with sender's ephemeral pubkey)
    let isValid = await verifyClaimSignature(claim);
    if (!isValid) {
      throw new Error("Signature verification failed for the claim");
    }

    // Verify the proof that the sender (their ephemeral pubkey) belongs to the AnonGroup
    const provider = Providers[claim.anonGroupProvider];
    isValid = await provider.verifyProof(
      claim.proof,
      claim.anonGroupId,
      claim.ephemeralPubkey,
      claim.ephemeralPubkeyExpiry,
      claim.proofArgs
    );

    return isValid;
  } catch (error) {
    // @ts-expect-error - error is an unknown type
    alert(error.message);
    // @ts-expect-error - error is an unknown type
    throw new Error(error.message);
  }
}


