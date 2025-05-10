"use client";

import React from "react";
import Head from "next/head";
import ClaimList from "../components/claim-list";

// See messages from one anon group
export default function GroupPage() {
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
