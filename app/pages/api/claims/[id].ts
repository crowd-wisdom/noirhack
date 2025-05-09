import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { SignedClaimWithProof } from "@/lib/types";

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
    getSingleClaim(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getSingleClaim(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
console.log("get single claim", id)
    if (!id) {
      res.status(400).json({ error: "Claim ID is required" });
      return;
    }

    const { data, error } = await supabase
      .from("claims")
      .select(`
        id,
        group_id,
        group_provider,
        title,
        signature,
        description,
        source_url,
        created_at,
        internal,
        likes,
        status,
        curator_pubkey,
        vote_deadline,
        expires_at,
        memberships!curator_pubkey(pubkey, role, proof, pubkey_expiry, proof_args),
        votes:claim_votes(
          id,
          vote,
          created_at,
          voter:memberships!voter_pubkey(pubkey, role)
        ),
        evidence_files(
          id,
          file_url,
          uploaded_at
        )
      `)
      
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }
   
    if (data.internal) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res
          .status(401)
          .json({ error: "Authorization required for internal claims" });
        res.end();
        return;
      }

      const pubkey = authHeader.split(" ")[1];
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("*")
        .eq("pubkey", pubkey)
        .eq("group_id", data.group_id)
        .single();

      if (membershipError || !membershipData) {
        res.status(401).json({ error: "Invalid public key for this group" });
        res.end();
        return;
      }
    }
  
    const claim: SignedClaimWithProof = {
      id: data.id,
      anonGroupId: data.group_id,
      sourceUrl: data.source_url,
      status: data.status,
      anonGroupProvider: data.group_provider,
      title: data.title,
      description: data.description,
      timestamp: data.created_at,
      voteDeadline: data.vote_deadline,
      expiresAt: data.expires_at,
      signature: data.signature,
      ephemeralPubkey: data.curator_pubkey,
       // @ts-expect-error memberships is not array
      ephemeralPubkeyExpiry: data.memberships.pubkey_expiry,
      internal: data.internal,
      likes: data.likes,
       // @ts-expect-error memberships is not array
      proof: data.memberships.proof ? JSON.parse(data.memberships.proof) : null,
       // @ts-expect-error memberships is not array
      proofArgs: data.memberships.proof_args ? JSON.parse(data.memberships.proof_args) : null,
    };
    console.log("claim on claims details",claim)



    res.status(200).json(claim);
  } catch (error) {
    console.error("Error fetching claim:", error);
    res.status(500).json({ error: "Error fetching claim" });
  }
} 