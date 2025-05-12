import { UltraHonkBackend } from '@aztec/bb.js';
import { CompiledCircuit, Noir } from '@noir-lang/noir_js';
import circuit_simple_vote from '../../assets/simple_vote/simple_vote.json';
import circuit_poseidon from '../../assets/hashing_poseidon/hashing_poseidon.json';


class NoirInstance {
    circuitEspecification: CompiledCircuit;
    noir_instance: Noir;
    noir_backend: UltraHonkBackend;
    name : string;

    constructor(circuitEspecification : CompiledCircuit,name : string) {
        this.circuitEspecification = circuitEspecification;
        this.noir_instance = new Noir(circuitEspecification as CompiledCircuit)
        this.noir_backend = new UltraHonkBackend(circuit_simple_vote.bytecode, { threads: 8, crsPath: '/tmp/.bb-crs' })
        this.name = name
    }

}

export async function generateNullifierVote(vote:string,voter_secret:string) {
    const noir_hashing_poseidon = new NoirInstance(circuit_poseidon as CompiledCircuit,"hashing_poseidon");
    const hashing_poseidon = await noir_hashing_poseidon.noir_instance.execute({ voter_secret, vote });
    const vote_hash = hashing_poseidon.returnValue
    
    const noir_simple_vote = new NoirInstance(circuit_simple_vote as CompiledCircuit,"simple_vote");
    console.info("logs", "Generating witness... ⏳");
    const { witness,returnValue } = await noir_simple_vote.noir_instance.execute({ voter_secret, vote, vote_hash });
    console.info("logs", "Generated witness... ✅");
    console.info("logs", "Generating proof... ⏳");
    const proof = await noir_simple_vote.noir_backend.generateProof(witness);
    console.info("logs", "Generated proof... ✅");
    console.info("results", proof.proof);
    console.info("logs", "Verifying proof... ⌛");
    const isValid = await noir_simple_vote.noir_backend.verifyProof(proof);
    console.info("logs", `Proof is ${isValid ? "valid" : "invalid"}... ✅`);

    return returnValue
}

export async function stringToNumberInRange(text:string) {
  const limiteSuperior = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  let numero = 0n;
  for (const byte of hashArray) {
    numero = (numero << 8n) + BigInt(byte);
  }
  const numeroEnRango = numero % limiteSuperior;
  return numeroEnRango;
}