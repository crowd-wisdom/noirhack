export function isClaimLiked(claimId: string) {
  return window.localStorage.getItem(`liked-${claimId}`) === "T";
}

export function setClaimLiked(claimId: string, liked: boolean) {
  if (!liked) {
    window.localStorage.removeItem(`liked-${claimId}`);
  } else {
    window.localStorage.setItem(`liked-${claimId}`, "T");
  }
}
