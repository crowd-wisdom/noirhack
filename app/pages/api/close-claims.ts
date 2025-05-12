import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Vote {
  vote: "up" | "down";
}

interface ExpiredClaim {
  id: string;
  status: string;
  vote_deadline: string;
  votes: Vote[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Find claims that are pending/active and have passed their vote deadline
    const { data: expiredClaims, error: expiredClaimsError } = await supabase
      .from("claims")
      .select(`
        id,
        status,
        vote_deadline,
        votes:claim_votes(
          vote
        )
      `)
      .in("status", ["pending", "active"])
      .lt("vote_deadline", new Date().toISOString());

    if (expiredClaimsError) {
      throw expiredClaimsError;
    }

    const results = {
      processed: 0,
      closed: 0,
      rejected: 0,
      errors: 0,
    };

    // Process each expired claim
    for (const claim of (expiredClaims as ExpiredClaim[])) {
      try {
        // Count up and down votes
        const upVotes = claim.votes.filter((v: Vote) => v.vote === "up").length;
        const downVotes = claim.votes.filter((v: Vote) => v.vote === "down").length;
        
        // Determine new status based on vote count
        // If more upvotes than downvotes, close as successful, otherwise reject
        const newStatus = upVotes > downVotes ? "closed" : "rejected";

        // Update claim status
        const { error: updateError } = await supabase
          .from("claims")
          .update({ status: newStatus })
          .eq("id", claim.id);

        if (updateError) {
          throw updateError;
        }

        results.processed++;
        if (newStatus === "closed") {
          results.closed++;
        } else {
          results.rejected++;
        }
      } catch (error) {
        console.error(`Error processing claim ${claim.id}:`, error);
        results.errors++;
      }
    }

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error processing expired claims:", error);
    res.status(500).json({
      success: false,
      error: "Error processing expired claims",
    });
  }
}
