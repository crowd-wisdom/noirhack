import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useLocalStorage } from "@uidotdev/usehooks";
import IonIcon from "@reacticons/ionicons";
import { Claim, LocalStorageKeys, SignedClaimWithProof } from "../lib/types";
import { getEphemeralPubkey } from "../lib/ephemeral-key";
import { generateKeyPairAndRegister, postClaim } from "../lib/core";
import { generateNameFromPubkey } from "../lib/utils";
import { Providers } from "../lib/providers";
import SignWithGoogleButton from "./siwg";

type ClaimFormProps = {
  isInternal?: boolean;
  onSubmit: (message: SignedClaimWithProof) => void;
};

const ClaimForm: React.FC<ClaimFormProps> = ({ isInternal, onSubmit }) => {
  const [currentGroupId, setCurrentGroupId] = useLocalStorage<string | null>(
    "currentGroupId",
    null
  );
  const [currentProvider, setCurrentProvider] = useLocalStorage<string | null>(
    LocalStorageKeys.CurrentProvider,
    null
  );

  const provider = currentProvider ? Providers[currentProvider] : null;
  const anonGroup =
    provider && currentGroupId ? provider.getAnonGroup(currentGroupId) : null;

  const isRegistered = !!currentGroupId;
  const senderName = isInternal
    ? generateNameFromPubkey(getEphemeralPubkey()?.toString() ?? "")
    : `Someone from ${anonGroup?.title}`;

  const welcomeMessage = `
    Sign in with your Google work account to anonymously post as "Someone from your company".
  `;

  // State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [isPosting, setIsPosting] = useState(false);
  const [isRegistering, setIsRegistering] = useState("");
  const [status, setStatus] = useState(!isRegistered ? welcomeMessage : "");

  // Handlers
  async function handleSignIn(providerName: string) {
    try {
      setIsRegistering(providerName);
      setStatus(`Generating cryptographic proof of your membership without revealing your identity.
        This will take about 20 seconds...`);

      const { anonGroup } = await generateKeyPairAndRegister(providerName);

      setCurrentGroupId(anonGroup.id);
      setCurrentProvider(providerName);
      setStatus("");
    } catch (error) {
      console.error("Error:", error);
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setIsRegistering("");
    }
  }

  async function resetIdentity() {
    setCurrentGroupId(null);
    setCurrentProvider(null);
    setStatus(welcomeMessage);
  }

  async function onSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !sourceUrl.trim()) return;

    setIsPosting(true);

    try {
      const claimObj: Claim = {
        id: crypto.randomUUID().split("-").slice(0, 2).join(""),
        timestamp: new Date(),
        title,
        description,
        sourceUrl,
        status: 'pending',
        internal: !!isInternal,
        likes: 0,
        anonGroupId: currentGroupId as string,
        anonGroupProvider: currentProvider as string,
        expiresAt: new Date(new Date().getTime() + 2* 24 * 60 * 60 * 1000), // 48 hours
        voteDeadline: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hours
      };

      const signedClaim = await postClaim(claimObj);

      setTitle("");
      setDescription("")
      setSourceUrl("")
      onSubmit(signedClaim as SignedClaimWithProof);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setIsPosting(false);
    }
  }

  const isTextAreaDisabled = !!isRegistering || isPosting || !isRegistered;

  return (
    <div className="message-form">
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Enter claim title"
          disabled={isTextAreaDisabled}
          className="form-input"
        />
        {!isTextAreaDisabled && title.length > 0 && (
          <span className="message-form-character-count">
            {title.length}/100
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter claim description"
          maxLength={280}
          disabled={isTextAreaDisabled}
          className="form-input"
        />
        {!isTextAreaDisabled && description.length > 0 && (
          <span className="message-form-character-count">
            {description.length}/280
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="sourceUrl">Source URL</label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Enter source URL"
          maxLength={280}
          disabled={isTextAreaDisabled}
          className="form-input"
        />
        {!isTextAreaDisabled && sourceUrl.length > 0 && (
          <span className="message-form-character-count">
            {sourceUrl.length}/280
          </span>
        )}
      </div>

      <div className="message-form-footer">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="message-form-footer-message">
            {status ? status : `Posting a claim for misinformation as "${senderName}"`}
          </span>

          {isRegistered && (
            <div className="message-form-footer-buttons">
              <button
                title={
                  "Multiple messages sent by one identity can be linked. " +
                  "Refresh your identity by generating a new proof."
                }
                onClick={() => handleSignIn("google-oauth")}
                tabIndex={-1}
              >
                {isRegistering ? (
                  <span className="spinner-icon" />
                ) : (
                  <IonIcon name="refresh-outline" />
                )}
              </button>
              <button
                title="Reset your identity"
                onClick={resetIdentity}
                tabIndex={-1}
              >
                <IonIcon name="log-out-outline" />
              </button>
            </div>
          )}
        </div>

        {!isRegistered && (
          <div className="message-form-footer-buttons">
            <SignWithGoogleButton
              onClick={() => handleSignIn("google-oauth")}
              isLoading={isRegistering === "google-oauth"}
              disabled={!!isRegistering}
            />
          </div>
        )}

        <button
          type="submit"
          onClick={onSubmitClaim}
          disabled={isTextAreaDisabled}
          className="message-form-submit"
        >
          {isPosting ? (
            <span className="spinner-icon" />
          ) : (
            <>
              <IonIcon name="send-outline" />
              <span>Post</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(ClaimForm), {
  ssr: false,
});
