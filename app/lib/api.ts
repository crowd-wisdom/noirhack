import { Message, SignedClaim, SignedMessage, SignedMessageWithProof } from "./types";
import { getEphemeralPubkey } from "./ephemeral-key";

export async function fetchMessages({
  limit,
  groupId,
  isInternal,
  beforeTimestamp,
  afterTimestamp,
}: {
  limit: number;
  isInternal?: boolean;
  groupId?: string;
  beforeTimestamp?: number | null;
  afterTimestamp?: number | null;
}) {
  const url = new URL(window.location.origin + "/api/messages");

  url.searchParams.set("limit", limit.toString());
  if (groupId) url.searchParams.set("groupId", groupId);
  if (isInternal) url.searchParams.set("isInternal", "true");
  if (afterTimestamp) url.searchParams.set("afterTimestamp", afterTimestamp.toString());
  if (beforeTimestamp) url.searchParams.set("beforeTimestamp", beforeTimestamp.toString());

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (isInternal) {
    const pubkey = getEphemeralPubkey();
    if (!pubkey) {
      throw new Error("No public key found");
    }
    headers["Authorization"] = `Bearer ${pubkey}`; // Pubkey modulus is used as the bearer token
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Call to /messages API failed: ${errorMessage}`);
  }

  const messages = await response.json();
  return messages.map((message: Message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}

export async function fetchClaims({
  limit,
  groupId,
  isInternal,
  beforeTimestamp,
  afterTimestamp,
}: {
  limit: number;
  isInternal?: boolean;
  groupId?: string;
  beforeTimestamp?: number | null;
  afterTimestamp?: number | null;
}) {
  const url = new URL(window.location.origin + "/api/claims");

  url.searchParams.set("limit", limit.toString());
  if (groupId) url.searchParams.set("groupId", groupId);
  if (isInternal) url.searchParams.set("isInternal", "true");
  if (afterTimestamp) url.searchParams.set("afterTimestamp", afterTimestamp.toString());
  if (beforeTimestamp) url.searchParams.set("beforeTimestamp", beforeTimestamp.toString());

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };  

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Call to /claims API failed: ${errorMessage}`);   
  }

  const claims = await response.json();
  console.log("claims on api", claims)
  return claims.map((claim: SignedClaim) => ({
    ...claim,
    //anonGroupId: claim.anon_gr
    timestamp: new Date(claim.timestamp),
  }));
}

export async function fetchMessage(
  id: string,
  isInternal: boolean = false
): Promise<SignedMessageWithProof> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (isInternal) {
    const pubkey = getEphemeralPubkey();
    if (!pubkey) {
      throw new Error("No public key found");
    }
    headers["Authorization"] = `Bearer ${pubkey}`;
  }

  const response = await fetch(`/api/messages/${id}`, { headers });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Call to /messages/${id} API failed: ${errorMessage}`);
  }

  const message = await response.json();
  try {
    message.signature = BigInt(message.signature);
    message.ephemeralPubkey = BigInt(message.ephemeralPubkey);
    message.ephemeralPubkeyExpiry = new Date(message.ephemeralPubkeyExpiry);
    message.timestamp = new Date(message.timestamp);
    message.proof = Uint8Array.from(message.proof);
  } catch (error) {
    console.warn("Error parsing message:", error);
  }

  return message;
}

export async function createMembership({
  ephemeralPubkey,
  ephemeralPubkeyExpiry,
  groupId,
  provider,
  proof,
  proofArgs,
  role,
  semaphoreIdentityCommitment
}: {
  ephemeralPubkey: string;
  ephemeralPubkeyExpiry: Date;
  groupId: string;
  provider: string;
  proof: Uint8Array;
  proofArgs: object;
  role: string;
  semaphoreIdentityCommitment: string
}) {
  const response = await fetch("/api/memberships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ephemeralPubkey,
      ephemeralPubkeyExpiry: ephemeralPubkeyExpiry.toISOString(),
      groupId,
      provider,
      proof: Array.from(proof),
      proofArgs,
      role,
      semaphoreIdentityCommitment
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(`Call to /memberships API failed: ${errorMessage}`);
    throw new Error("Call to /memberships API failed");
  }
}

export async function createMessage(signedMessage: SignedMessage) {
  const response = await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...signedMessage,
      ephemeralPubkey: signedMessage.ephemeralPubkey.toString(),
      signature: signedMessage.signature.toString(),
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(`Call to /messages API failed: ${errorMessage}`);
    throw new Error("Call to /messages API failed");
  }
}

export async function createClaim(signedClaim: SignedClaim) {
  console.log(" on createclaim", signedClaim)
  const response = await fetch("/api/claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...signedClaim,
      ephemeralPubkey: signedClaim.ephemeralPubkey.toString(),
      signature: signedClaim.signature.toString(),
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(`Call to /claims API failed: ${errorMessage}`);
    throw new Error("Call to /claims API failed");
  }
}

export async function toggleLike(claimId: string, like: boolean) {
  try {
    const pubkey = getEphemeralPubkey();

    const response = await fetch("/api/likes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pubkey}`,
      },
      body: JSON.stringify({
        claimId,
        like,
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Call to /likes API failed: ${errorMessage}`);
      throw new Error("Call to /likes API failed");
    }

    const data = await response.json();
    return data.liked;
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
}

export async function fetchClaim(claimId: string, isInternal: boolean) {
  
    const pubkey = getEphemeralPubkey();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (isInternal) {
      headers.Authorization = `Bearer ${pubkey}`;
    }

    const response = await fetch(`/api/claims/${claimId}`, {
      headers,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Call to /claims/${claimId} API failed: ${errorMessage}`);
      throw new Error("Call to /claims API failed");
    }

    const claim = await response.json();
    try {
      claim.signature = BigInt(claim.signature);
      claim.ephemeralPubkey = BigInt(claim.ephemeralPubkey);
      claim.ephemeralPubkeyExpiry = new Date(claim.ephemeralPubkeyExpiry);
      claim.timestamp = new Date(claim.timestamp);
      claim.proof = Uint8Array.from(claim.proof);
    } catch (error) {
      console.warn("Error parsing claim:", error);
    }
    return claim;
}