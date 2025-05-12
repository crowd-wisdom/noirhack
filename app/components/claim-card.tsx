import React, { useRef, useState } from "react";
import Image from "next/image";
import TimeAgo from "javascript-time-ago";
import Link from "next/link";
import IonIcon from "@reacticons/ionicons";
import type { SignedClaim } from "../lib/types";
import { generateNameFromPubkey } from "../lib/utils";
import { setClaimLiked, isClaimLiked } from "../lib/store";
import { checkVoteNullifier, fetchClaim, toggleLike, voteOnClaim } from "../lib/api";
import { hasEphemeralKey } from "../lib/ephemeral-key";
import { verifyClaim } from "../lib/core";
import { Providers } from "../lib/providers";

interface ClaimCardProps {
  claim: SignedClaim;
  isInternal?: boolean;
  vote?: boolean;
}

type VerificationStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

const ClaimCard: React.FC<ClaimCardProps> = ({ claim, isInternal, vote }) => {
  const timeAgo = useRef(new TimeAgo("en-US")).current;
  
  // States
  const [likeCount, setLikeCount] = useState(claim.likes || 0);
  const [isLiked, setIsLiked] = useState(isClaimLiked(claim.id));
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);

  // Check vote status when component mounts or when vote prop changes
  React.useEffect(() => {
    if (vote) {
      checkVoteNullifier(claim.id)
        .then(voted => setHasVoted(voted))
        .catch(error => {
          console.error("Error checking vote status:", error);
          setHasVoted(false);
        });
    }
  }, [vote, claim.id]);

  const provider = Providers[claim.anonGroupProvider];
  if (!provider) {
    console.error(`Provider not found for ${claim.anonGroupProvider}`);
    return <div className="message-card">Invalid provider</div>;
  }
  const anonGroup = provider.getAnonGroup(claim.anonGroupId);

  const isGroupPage = window.location.pathname === `/${provider.getSlug()}/${claim.anonGroupId}`;

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

  function renderVoteStatusBadge() {
    return (
      <span className={`claim-status-badge ${claim.status}`}>
        Voted
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

  async function upvote() {
    try {
      setIsVoting(true);
      await voteOnClaim(claim.id, true);
      setHasVoted(true);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  }

  async function downvote() {
    try {
      setIsVoting(true);
      await voteOnClaim(claim.id, false);
      setHasVoted(true);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
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

      <div className="message-card-footer flex w-full">
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
        {vote && !hasVoted && (
          <div className="vote-buttons">
            {isVoting ? (
              <div className="vote-buttons-loading">
                <span className="spinner-icon small"></span>
              </div>
            ) : (
              <>
                <button 
                  className="vote-button upvote" 
                  onClick={() => upvote()}
                >
                  <IonIcon name="arrow-up-outline" />
                </button>
                <button 
                  className="vote-button downvote" 
                  onClick={() => downvote()}
                >
                  <IonIcon name="arrow-down-outline" />
                </button>
              </>
            )}
          </div>
        )}
        {hasVoted && (
          <div className="message-card-header-right">
            {renderVoteStatusBadge()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimCard; 