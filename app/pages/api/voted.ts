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
  if (req.method === "GET") {
    return checkVoteNullifier(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function checkVoteNullifier(req: NextApiRequest, res: NextApiResponse) {
    const { claimId } = req.query;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Authorization required" });
      res.end();
      return;
    }

    const pubkey = authHeader.split(" ")[1];
    try {
        const { data, error } = await supabase
          .from("memberships")
          .select("role, group_id")
          .eq("pubkey", pubkey)
          .single();
    
        if (error) {
          throw error;
        }
    
        if (!data) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
        
        const { data: nullifier } = await supabase
          .from("claim_votes")
          .select("vote_nullifier")
          .eq("claim_id", claimId)
          .eq("voter_pubkey", pubkey)
          .single();

        return res.status(200).json({
          voted: nullifier !== null,
          nullifier: nullifier
        });
      } catch (error) {
        console.error("Error checking user role:", error);
        return res.status(500).json({
          success: false,
          message: "Error checking user role",
        });
      }
}
