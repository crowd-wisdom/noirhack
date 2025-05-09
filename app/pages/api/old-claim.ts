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
    return createClaim(req, res);
  } else if (req.method === "GET") {
    return getClaims(req, res);
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function createClaim(req: NextApiRequest, res: NextApiResponse) {
  const {
    curatorPubkey,
    title,
    content,
    sourceUrl,
    expiresAt,
  } = req.body;

  try {
    const { error } = await supabase.from("claims").insert([
      {
        curator_pubkey: curatorPubkey,
        title,
        content,
        source_url: sourceUrl,
        expires_at: new Date(expiresAt),
      },
    ]);

    if (error) {
      throw new Error(`Error inserting to claims table: ${error?.message}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating claim:", error);
    res.status(500).json({ success: false, message: "Error creating claim" });
  }
}

async function getClaims(req: NextApiRequest, res: NextApiResponse) {
  const { sortBy, status } = req.query;

  try {
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
      // Assuming you have a view or computed column for vote count
      query = query.order("vote_count", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching claims: ${error?.message}`);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ success: false, message: "Error fetching claims" });
  }
} 