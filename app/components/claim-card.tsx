import React, { useRef, useState } from "react";
import Image from "next/image";
import TimeAgo from "javascript-time-ago";
import Link from "next/link";
import IonIcon from "@reacticons/ionicons";
import type { SignedClaim } from "../lib/types";
import { generateNameFromPubkey } from "../lib/utils";
import { setClaimLiked, isClaimLiked } from "../lib/store";
import { fetchClaim, toggleLike } from "../lib/api";
import { hasEphemeralKey } from "../lib/ephemeral-key";
import { verifyClaim, verifyMessage } from "../lib/core";
import { Providers } from "../lib/providers";

interface ClaimCardProps {
  claim: SignedClaim;
  isInternal?: boolean;
}

type VerificationStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

const ClaimCard: React.FC<ClaimCardProps> = ({ claim, isInternal }) => {
  const timeAgo = useRef(new TimeAgo("en-US")).current;

  const provider = Providers[claim.anonGroupProvider];
  console.log("provider?", provider)
  if (!provider) {
    console.error(`Provider not found for ${claim.anonGroupProvider}`);
    return <div className="message-card">Invalid provider</div>;
  }
  const anonGroup = provider.getAnonGroup(claim.anonGroupId);

  // States
  const [likeCount, setLikeCount] = useState(claim.likes || 0);
  const [isLiked, setIsLiked] = useState(isClaimLiked(claim.id));
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");

  const isGroupPage = window.location.pathname === `/${provider.getSlug()}/${claim.anonGroupId}`;
  const isClaimPage = window.location.pathname === `/claims/${claim.id}`;

  // Handlers
  async function onLikeClick() {
    try {
      const newIsLiked = !isLiked;

      setIsLiked(newIsLiked);
      setLikeCount((prev: number) => (newIsLiked ? prev + 1 : prev - 1));
      setClaimLiked(claim.id, newIsLiked);

      await toggleLike(claim.id, newIsLiked);
    } catch (error) {
      setIsLiked(isLiked);
      setLikeCount(likeCount);
      setClaimLiked(claim.id, isLiked);
    }
  }

  async function onVerifyClick() {
    setVerificationStatus("verifying");

    try {
      const fullClaim = await fetchClaim(claim.id, claim.internal);
      console.log("fullClaim", fullClaim)
      const isValid = await verifyClaim({
        ...fullClaim,
        ephemeralPubkey: BigInt(fullClaim.ephemeralPubkey),
        signature: BigInt(fullClaim.signature),
        ephemeralPubkeyExpiry: new Date(fullClaim.ephemeralPubkeyExpiry),
        timestamp: new Date(fullClaim.timestamp),
        proof: Uint8Array.from(fullClaim.proof),
        proofArgs: fullClaim.proofArgs || {},
      });
      console.log("isValid", isValid)
      setVerificationStatus(isValid ? "valid" : "invalid");
    } catch (error) {
      console.error("Verification failed:", error);
      setVerificationStatus("error");
    }
  }

  function renderLogo() {
    return (
      <Link
        href={`/${provider.getSlug()}/${claim.anonGroupId}`}
        className="message-card-header-logo"
      >
        <Image
          src={anonGroup.logoUrl}
          alt={anonGroup.title}
          width={30}
          height={30}
        />
      </Link>
    );
  }

  function renderSender() {
    const senderName = generateNameFromPubkey(claim.ephemeralPubkey.toString());
    return (
      <div className="message-card-header-sender-text">
        <span className={`message-card-header-sender-name ${isInternal ? "internal" : ""}`}>
          {isGroupPage ? (
            senderName
          ) : (
            <Link href={`/${provider.getSlug()}/${claim.anonGroupId}`}>
              {senderName}
            </Link>
          )}
        </span>
        <span className="message-card-header-timestamp">
          {timeAgo.format(claim.timestamp)}
        </span>
      </div>
    );
  }

  function renderVerificationStatus() {
    if (verificationStatus === "idle") {
      return (
        <span className="message-card-verify-button" onClick={onVerifyClick}>
          Verify
        </span>
      );
    }

    return (
      <span className={`message-card-verify-status ${verificationStatus}`}>
        {verificationStatus === "verifying" && (
          <span className="message-card-verify-icon spinner-icon small"></span>
        )}
        {verificationStatus === "valid" && (
          <span className="message-card-verify-icon valid">
            <IonIcon name="checkmark-outline" />
          </span>
        )}
        {verificationStatus === "invalid" && (
          <span className="message-card-verify-icon invalid">
            <IonIcon name="close-outline" />
          </span>
        )}
        {verificationStatus === "error" && (
          <span className="message-card-verify-icon error">
            <IonIcon name="alert-outline" />
          </span>
        )}
      </span>
    );
  }

  function renderStatusBadge() {
    return (
      <span className={`claim-status-badge ${claim.status}`}>
        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
      </span>
    );
  }

  // Render
  return (
    <div className="message-card">
      <header className="message-card-header">
        <div className="message-card-header-sender">
          {renderLogo()}
          {renderSender()}
        </div>

        <div className="message-card-header-right">
          {renderStatusBadge()}
          {renderVerificationStatus()}
        </div>
      </header>

      <main className="message-card-content">
        <h3>{claim.title}</h3>
        <p>{claim.description}</p>
        {claim.sourceUrl && (
          <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
            Source
          </a>
        )}
      </main>

      <div className="message-card-footer">
        <div className="like-button-container">
          <button
            onClick={onLikeClick}
            disabled={!hasEphemeralKey()}
            className={`like-button ${isLiked ? "liked" : ""}`}
          >
            <IonIcon name={isLiked ? "heart" : "heart-outline"} />
            <span className="like-count">{likeCount}</span>
          </button>
        </div>
        {!isClaimPage && (
          <Link href={`/claims/${claim.id}`} className="claim-link">
            View Details
          </Link>
        )}
      </div>
    </div>
  );
};

export default ClaimCard; 