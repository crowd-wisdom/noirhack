import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
  if (req.method === "POST") {
    return createClaimVote(req, res);
  } else if (req.method === "GET") {
    return getClaimVotes(req, res);
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function createClaimVote(req: NextApiRequest, res: NextApiResponse) {
  const {
    claimId,
    vote,
  } = req.body;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Authorization required" });
      res.end();
      return;
    }

    const voterPubkey = authHeader.split(" ")[1];

    // Check if the voter is a validator
    const { data: voter, error: voterError } = await supabase
      .from("memberships")
      .select("role")
      .eq("pubkey", voterPubkey)
      .single();

    if (voterError || !voter || voter.role !== "validator") {
      throw new Error("Only validators can vote on claims");
    }

    // Check if claim is still active
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("status")
      .eq("id", claimId)
      .single();

    // Todo: check if worth to manage a "active" status for voting start
    if (claimError || !claim || claim.status !== "pending") {
      throw new Error("Cannot vote on inactive or closed claims");
    }
    console.log("claimid", claimId, "voterPubkey", voterPubkey, "vote", vote)

    // Todo: checkear si existe nullifier
    const nullifier_exist = false;
    if (nullifier_exist) {
      throw new Error("Nullifier exist. Already voted.");
    }
         
    // create nullifier 
    const vote_nullifier = "";

    const { error } = await supabase.from("claim_votes").insert([
      {
        id: crypto.randomUUID(),
        claim_id: claimId,
        voter_pubkey: voterPubkey,
        role: "validator",
        vote,
        vote_nullifier,
        created_at: new Date(),
      },
    ]);

    if (error) {
      throw new Error(`Error inserting to claim_votes table: ${error?.message}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating claim vote:", error);
    res.status(500).json({ success: false, message: "Error creating claim vote" });
  }
}

async function getClaimVotes(req: NextApiRequest, res: NextApiResponse) {
  const { claimId } = req.query;

  if (!claimId) {
    return res.status(400).json({ success: false, message: "Claim ID is required" });
  }

  try {
    const { data, error } = await supabase
      .from("claim_votes")
      .select(`
        *,
        voter:memberships!voter_pubkey(pubkey, role)
      `)
      .eq("claim_id", claimId);

    if (error) {
      throw new Error(`Error fetching claim votes: ${error?.message}`);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching claim votes:", error);
    res.status(500).json({ success: false, message: "Error fetching claim votes" });
  }
} 