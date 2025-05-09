import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { verifyClaimSignature, verifyMessageSignature } from "../../../lib/ephemeral-key";
import { SignedClaim } from "../../../lib/types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    console.log("claims on index")
    fetchClaims(req, res);
  } else if (req.method === "POST") {
    postClaim(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export async function postClaim(
  request: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = await request.body;

    const signedClaim: SignedClaim = {
      id: body.id,
      anonGroupId: body.anonGroupId,
      anonGroupProvider: body.anonGroupProvider,
      title: body.title,
      description: body.description,
      sourceUrl: body.sourceUrl,
      timestamp: new Date(body.timestamp),
      expiresAt: new Date(body.expires_at),
      voteDeadline: new Date(body.vote_deadline),
      internal: body.internal,
      likes: 0,
      signature: BigInt(body.signature),
      ephemeralPubkey: BigInt(body.ephemeralPubkey),
      ephemeralPubkeyExpiry: new Date(body.ephemeralPubkeyExpiry),
      status: 'pending'
    };
    console.log("signed claim", signedClaim)

    // Verify pubkey is registered and is a curator
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role")
      .eq("pubkey", signedClaim.ephemeralPubkey.toString())
      .single();

    if (membershipError || !membership || membership.role !== "curator") {
      throw new Error("Only curators can create claims");
    }

    // Verify signature
    const isValid = await verifyClaimSignature(signedClaim);

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // Create claim
    const { error: insertError } = await supabase.from("claims").insert([
      {
        id: signedClaim.id,
        group_id: signedClaim.anonGroupId,
        group_provider: signedClaim.anonGroupProvider,
        curator_pubkey: signedClaim.ephemeralPubkey.toString(),
        title: signedClaim.title,
        description: signedClaim.description,
        source_url: signedClaim.sourceUrl,
        created_at: signedClaim.timestamp,
        signature: signedClaim.signature.toString(),
        internal: signedClaim.internal,
        likes: signedClaim.likes,
        status: signedClaim.status,
        expires_at: new Date(signedClaim.timestamp.getTime() + 2 * 24 * 60 * 60 * 1000), // 48 hours
        vote_deadline: new Date(signedClaim.timestamp.getTime() + 24 * 60 * 60 * 1000), // 24 hours
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating claim:", error);
    res.status(500).json({ error: "Error creating claim" });
  }
}

export async function fetchClaims(
  request: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { sortBy, status } = request.query;
    let query = supabase
      .from("claims")
      .select(`
        *,
        curator:memberships!curator_pubkey(pubkey, role),
        votes:claim_votes(count),
        evidence_files(count)
      `);

    if (status) {
      query = query.eq("status", status);
    }

    if (sortBy === "created_at") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "vote_count") {
      query = query.order("vote_count", { ascending: false });
    }

    const { data, error } = await query;
 
    if (error) {
      throw error;
    }

    // Map database column names to TypeScript interface properties
    const mappedData = data.map((claim: any) => ({
      id: claim.id,
      anonGroupId: claim.group_id,
      anonGroupProvider: claim.group_provider,
      title: claim.title,
      description: claim.description,
      sourceUrl: claim.source_url,
      timestamp: claim.created_at,
      internal: claim.internal,
      likes: claim.likes,
      status: claim.status,
      signature: claim.signature,
      ephemeralPubkey: claim.curator_pubkey,
      ephemeralPubkeyExpiry: claim.pubkey_expiry,
    }));

    res.status(200).json(mappedData);
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ error: "Error fetching claims" });
  }
} 