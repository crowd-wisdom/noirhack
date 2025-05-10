import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { generateNoirProof, SemaphoreNoirProof } from "@semaphore-protocol/proof"
import { SemaphoreSubgraph } from "@semaphore-protocol/data"
import { SupportedNetwork } from "@semaphore-protocol/utils"
import { LocalStorageKeys } from "./types"
import { TransactionReceipt } from "ethers";

const reCreateGroup = async (idGroup:string,network:SupportedNetwork) => {
    const semaphoreSubgraph = new SemaphoreSubgraph(network)

    const { members } = await semaphoreSubgraph.getGroup(idGroup, { members: true })

    return members
}

export function createIdentity(pubKey: string) {
    const identity = new Identity(pubKey)
    console.log("identity", identity)
    return identity;
}

export async function addIdentityToCuratorsGroup() {
    const identity  = loadIdentity();
    if (!identity)
        return;
    const SEMAPHORE_SUPPORTED_NETWORK = process.env.NEXT_PUBLIC_SEMAPHORE_SUPPORTED_NETWORK as SupportedNetwork || 
      "scroll-sepolia";
    const SEMAPHORE_CURATOR_GROUP_ID = process.env.NEXT_PUBLIC_SEMAPHORE_CURATOR_GROUP_ID || "0";
    const members = await reCreateGroup(SEMAPHORE_CURATOR_GROUP_ID, SEMAPHORE_SUPPORTED_NETWORK);
    const group = new Group(members);
    group.addMember(identity.commitment);
    const proof: SemaphoreNoirProof = await generateNoirProof(
      identity,
      group,
      "add member to curator group",
      group.root
    );
    console.log("identity to group proof", proof);
    console.log("saveMemberOnChain ...", proof);
    const response_tx = await saveMemberOnChain(
      SEMAPHORE_CURATOR_GROUP_ID,
      identity.commitment
    );
    console.log("saveMemberOnChain ... successfull. Status of tx", response_tx.status);
    return proof;
}

const saveMemberOnChain = async (
  idGroup: string,
  identityCommitment: bigint
): Promise<TransactionReceipt> => {
  const url = process.env.NEXT_PUBLIC_SEMAPHORE_RELAYER + "semaphore/addMember";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "groupId": Number(idGroup),
      "identityCommitment": identityCommitment.toString()
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    console.error(`Call to semaphore/addMember API failed: ${errorMessage}`);
    throw new Error("Call to semaphore/addMember API failed");
  }
  return response.json();
}

export function saveIdentity(identity: Identity) {
    localStorage.setItem(LocalStorageKeys.SemaphoreIdentity, JSON.stringify({
        privateKey: identity.privateKey,
        secretScalar: identity.secretScalar.toString(),
        publicKey: identity.publicKey.toString(),
        commitment: identity.commitment.toString()
    }));
  }
  
export function loadIdentity() {
    const identityString = localStorage.getItem(LocalStorageKeys.SemaphoreIdentity);
    if (!identityString) {
      return null;
    }
  
    const identity = JSON.parse(identityString);
    return {
      privateKey: identity.privateKey,
      publicKey: identity.publicKey,
      secretScalar: BigInt(identity.secretScalar),
      commitment: BigInt(identity.commitment)
    } as Identity;
  }