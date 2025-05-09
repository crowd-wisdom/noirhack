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
    postLike(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function postLike(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { claimId, like } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Authorization required for internal claims" });
      res.end();
      return;
    }

    const pubkey = authHeader.split(" ")[1];

    if (!claimId || !pubkey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate pubkey
    const { data: membershipData } = await supabase
      .from("memberships")
      .select()
      .eq("pubkey", pubkey)
      .single();

    if (!membershipData || !membershipData.pubkey) {
      return res.status(400).json({ error: "Invalid pubkey" });
    }

    // Check if claim already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select()
      .eq("claim_id", claimId)
      .eq("pubkey", pubkey)
      .single();

    if (like && !existingLike) {
      // Like
      await Promise.all([
        supabase.from("likes").insert({
          claim_id: claimId,
          pubkey,
        }),
        supabase.rpc("increment_likes_count", {
          claim_id: claimId,
        }),
      ]);
    }

    if (!like && existingLike) {
      // Unlike
      await Promise.all([
        supabase
          .from("likes")
          .delete()
          .eq("claim_id", claimId)
          .eq("pubkey", pubkey),
        supabase.rpc("decrement_likes_count", {
          claim_id: claimId,
        }),
      ]);
    }

    return res.status(200).json({ liked: !existingLike });
  } catch (error) {
    console.error("Error handling like:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
