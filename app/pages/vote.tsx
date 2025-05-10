"use client";

import React from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useLocalStorage } from "@uidotdev/usehooks";
import ClaimList from "../components/claim-list";
import { ProviderSlugKeyMap } from "../lib/providers";

// See messages from one anon group
export default function GroupPage() {
  const [currentGroupId] = useLocalStorage<string | null>(
    "currentGroupId",
    null
  );

  return (
    <>
      <Head>
        <title>Vote on Pending Claims - CrowdWisdom</title>
      </Head>

      <div className="domain-page">
        <div className="page-header">
          <h1>Vote on Pending Claims</h1>
          <p className="page-description">
            Review and vote on claims that are awaiting validation.
          </p>
        </div>

        <ClaimList
          status={"pending"}
          vote={true}
        />
      </div>
    </>
  );
}
