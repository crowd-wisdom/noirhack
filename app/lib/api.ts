import { SignedClaim } from "./types";
import { getEphemeralPubkey } from "./ephemeral-key";

export async function fetchClaims({
  status,
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
  status: 'pending' | 'active' | 'closed' | 'rejected' | undefined;
}) {
  const url = new URL(window.location.origin + "/api/claims");

  url.searchParams.set("limit", limit.toString());
  if (groupId) url.searchParams.set("groupId", groupId);
  if (status) url.searchParams.set("status", status);
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

export async function checkMembershipRole({role}:{role: "curator" | "validator"}) {
  const pubkey = getEphemeralPubkey();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

      headers.Authorization = `Bearer ${pubkey}`;

    const response = await fetch(`/api/memberships/${role}`, {
      headers,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Call to /membershops/${role} API failed: ${errorMessage}`);
      throw new Error("Call to /memberships API failed");
    }

    const {success, hasRole} = await response.json();

    return hasRole;
}

export async function claimValidatorRole() {
  console.log("claiming validator role")
  const pubkey = getEphemeralPubkey();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

    headers.Authorization = `Bearer ${pubkey}`;

  const response = await fetch(`/api/claim-validator`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(`Call to /claim-validator/ API failed: ${errorMessage}`);
    throw new Error("Call to /claim-validator API failed");
  }

  const {success, hasRole} = await response.json();

  return hasRole;
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

export async function voteOnClaim(claimId: string, upvote: boolean) {
  try {
    const pubkey = getEphemeralPubkey();

    const response = await fetch("/api/claim-votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pubkey}`,
      },
      body: JSON.stringify({
        claimId,
        vote: upvote ? "up" : "down",
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Call to /claim-votes API failed: ${errorMessage}`);
      throw new Error("Call to /claim-votes API failed");
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
}

export async function checkVoteNullifier(claimId: string) {
  const pubkey = getEphemeralPubkey();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    headers.Authorization = `Bearer ${pubkey}`;
    const response = await fetch(`/api/voted?claimId=${claimId}`, {
      headers,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Call to /voted/${claimId} API failed: ${errorMessage}`);
      throw new Error("Call to /voted API failed");
    }

    const {voted, nullifier} = await response.json();
    console.log("nullifier")
    return voted;
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