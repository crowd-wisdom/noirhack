import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { poseidon2 } from "poseidon-lite"
import { generateNoirProof } from "@semaphore-protocol/proof"
import { verifyNoirProof } from "@semaphore-protocol/proof"
import { SemaphoreSubgraph } from "@semaphore-protocol/data"
import { SupportedNetwork } from "@semaphore-protocol/utils"

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
    const members = await reCreateGroup("0",'scroll-sepolia');
    const group = new Group(members);
    group.addMember(identity.commitment);
    const proof = await generateNoirProof(identity, group, "add member to curator group", group.root)
}

