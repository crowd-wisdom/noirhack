use std::hash::poseidon2;

fn main(voter_secret: Field, vote: Field) -> pub Field {
    let inputs_computed_vote_hash: [Field; 2] = [voter_secret, vote];
    poseidon2::Poseidon2::hash(inputs_computed_vote_hash, inputs_computed_vote_hash.len())
}

