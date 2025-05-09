import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { poseidon2 } from "poseidon-lite"
import { generateNoirProof } from "@semaphore-protocol/proof"
import { verifyNoirProof } from "@semaphore-protocol/proof"
import { SemaphoreSubgraph } from "@semaphore-protocol/data"
import { SupportedNetwork } from "@semaphore-protocol/utils"
import { LocalStorageKeys } from "./types"

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

export async function addIdentityToCuratorsGroup(identity: Identity) {
    const SEMAPHORE_SUPPORTED_NETWORK = process.env.NEXT_PUBLIC_SEMAPHORE_SUPPORTED_NETWORK as SupportedNetwork || "scroll-sepolia";
    const SEMAPHORE_CURATOR_GROUP_ID = process.env.NEXT_PUBLIC_SEMAPHORE_CURATOR_GROUP_ID || "0";
    const SEMAPHORE_VALIDATOR_GROUP_ID = process.env.NEXT_PUBLIC_SEMAPHORE_VALIDATOR_GROUP_ID || "1"
    const members = await reCreateGroup(SEMAPHORE_CURATOR_GROUP_ID, SEMAPHORE_SUPPORTED_NETWORK);
    const group = new Group(members);
    group.addMember(identity.commitment);
    const proof = await generateNoirProof(identity, group, "add member to curator group", group.root)
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