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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { role } = req.query;

  if (!role) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters: role",
    });
  }

  if (role !== "curator" && role !== "validator") {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Must be either 'curator' or 'validator'",
    });
  }

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
      .select("role")
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

    const hasRole = data.role === role;

    return res.status(200).json({
      success: true,
      hasRole,
    });
  } catch (error) {
    console.error("Error checking user role:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking user role",
    });
  }
} 