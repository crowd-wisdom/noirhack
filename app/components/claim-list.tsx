"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchClaim, fetchClaims, closeClaims } from "../lib/api";
import ClaimCard from "./claim-card";
import { SignedClaimWithProof } from "../lib/types";
import ClaimForm from "./claim-form";

const CLAIMS_PER_PAGE = 30;
const INITIAL_POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_INTERVAL = 100000; // 100 seconds

type ClaimListProps = {
  status?: 'pending' | 'active' | 'closed' | 'rejected';
  isInternal?: boolean;
  showForm?: boolean;
  groupId?: string;
  vote?: boolean;
};

const ClaimList: React.FC<ClaimListProps> = ({
  status,
  isInternal,
  showForm,
  groupId,
  vote
}) => {
  // State
  const [claims, setClaims]  = useState<SignedClaimWithProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [pollInterval, setPollInterval] = useState(INITIAL_POLL_INTERVAL);
  // Refs
  const observer = useRef<IntersectionObserver | null>(null);
  const claimListRef = useRef<HTMLDivElement>(null);

  // Ref to keep track of the last message element (to load more messages on scroll)
  const lastClaimElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadClaims(claims[claims.length - 1]?.timestamp.getTime());
        }
      });
      if (node) observer.current.observe(node);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claims, loading, hasMore]
  );

  // Cached helpers
  const loadClaims = useCallback(
    async (beforeTimestamp: number | null = null) => {
      if (isInternal && !groupId) return;
      setLoading(true);

      try {
        const fetchedClaims = await fetchClaims({
          status,
          isInternal: !!isInternal,
          limit: CLAIMS_PER_PAGE,
          beforeTimestamp,
          groupId,
        });

        const existingClaimsIds: Record<string, boolean> = {};
        claims.forEach((m) => {
          existingClaimsIds[m.id!] = true;
        });
        const cleanedClaims = fetchedClaims.filter(
          (c: SignedClaimWithProof) => !existingClaimsIds[c.id!]
        );
        console.log("cleaned claims", cleanedClaims)
        setClaims((prevClaims) => [...prevClaims, ...cleanedClaims]);
        setHasMore(fetchedClaims.length === CLAIMS_PER_PAGE);
      } catch (error) {
        setError((error as Error)?.message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupId, isInternal]
  );

  const checkForNewClaims = useCallback(async () => {
    if (isInternal && !groupId) return;

    try {
      const newClaims = await fetchClaims({
        status,
        groupId,
        isInternal: !!isInternal,
        limit: CLAIMS_PER_PAGE,
        afterTimestamp: claims[0]?.timestamp.getTime(),
      });

      if (newClaims.length > 0) {
        setClaims(newClaims);
        setPollInterval(INITIAL_POLL_INTERVAL);
      } else {
        setPollInterval((prevInterval) =>
          Math.min(prevInterval + 10000, MAX_POLL_INTERVAL)
        );
      }
    } catch (error) {
      console.error("Error checking for new claims:", error);
    }
  }, [groupId, isInternal, claims, status]);

  const checkForClosedClaims = useCallback(async () => {
    try {
      const result = await closeClaims();
      console.log("close claims:", result)
    } catch (error) {
      console.error("Error checking for new claims:", error);
    }
  }, [groupId, claims, status])

  // Effects
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      intervalId = setInterval(() => {
        if (claimListRef.current && claimListRef.current.scrollTop === 0) {
          checkForNewClaims();
        }
        checkForClosedClaims();
      }, pollInterval);
    };

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollInterval, checkForNewClaims]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Handlers
  function onNewClaimSubmit(signedClaim: SignedClaimWithProof) {
    setClaims((prevClaims) => [signedClaim, ...prevClaims]);
  }

  // Render helpers
  function renderLoading() {
    return (
      <div className="skeleton-loader">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="message-card-skeleton">
            <div className="message-card-skeleton-header">
              <div className="skeleton-text skeleton-short"></div>
            </div>
            <div className="skeleton-text skeleton-long mt-1"></div>
            <div className="skeleton-text skeleton-long mt-05"></div>
          </div>
        ))}
      </div>
    );
  }

  function renderNoClaims() {
    if (!groupId) return null;

    return (
      <div className="article text-center">
        <p className="title">No messages yet</p>
        <p className="mb-05">
          Are you a member of <span>{groupId}</span>?
        </p>
        {!isInternal ? (
          <p>
            Head over to the <Link href="/">homepage</Link> to send an anonymous
            message by proving you are a member of <span>{groupId}</span>!
          </p>
        ) : (
          <p>
            No messages yet. Be the first one to send anonymous messages to your
            teammates.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {showForm && (
        <ClaimForm isInternal={isInternal} onSubmit={onNewClaimSubmit} />
      )}

      <div className="message-list" ref={claimListRef}>
        {claims.map((claim, index) => (
          <div
            key={claim.id || index}
            ref={index === claims.length - 1 ? lastClaimElementRef : null}
          >
            <ClaimCard
              claim={claim as SignedClaimWithProof}
              isInternal={isInternal}
              vote={vote}
            />
          </div>
        ))}
        {loading && renderLoading()}
        {!loading && !error && claims.length === 0 && renderNoClaims()}
      </div>

      {error && <div className="error-message">{error}</div>}
    </>
  );
};

export default ClaimList;
