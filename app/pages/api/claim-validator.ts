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
    return claimValidatorRole(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function claimValidatorRole(req: NextApiRequest, res: NextApiResponse) {
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
        
        // check if data.groupId belong to public.whitelisted_domains 
        const { data: whitelistedDomain, error: whitelistError } = await supabase
          .from("whitelisted_domains")
          .select("active")
          .eq("group_id", data.group_id)
          .single();

        if (whitelistError || !whitelistedDomain || !whitelistedDomain.active) {
          return res.status(403).json({
            success: false,
            message: "Domain not whitelisted",
          });
        }

        // Update role to validator
        const { error: updateError } = await supabase
          .from("memberships")
          .update({ role: "validator" })
          .eq("pubkey", pubkey);

        if (updateError) {
          throw updateError;
        }

        return res.status(200).json({
          success: true,
          hasRole: true,
        });
      } catch (error) {
        console.error("Error checking user role:", error);
        return res.status(500).json({
          success: false,
          message: "Error checking user role",
        });
      }
}
