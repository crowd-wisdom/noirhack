import React from "react";
import Head from "next/head";
import ClaimList from "@/components/claim-list";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>CrowdWisdom - Anonymous Validation Protocol for Addressing Misinformation on the Open Web</title>
      </Head>

      <div className="home-page">
        <ClaimList showForm />
      </div>
    </>
  );
}
