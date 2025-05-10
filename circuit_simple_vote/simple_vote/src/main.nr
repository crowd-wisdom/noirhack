use std::hash::poseidon2;

fn main(voter_secret: Field, vote: Field, vote_hash: pub Field) -> pub Field {
    let t = vote as u1;

    assert(t | t == 1);
    let inputs_computed_vote_hash: [Field; 2] = [voter_secret, vote];
    let computed_vote_hash =
        poseidon2::Poseidon2::hash(inputs_computed_vote_hash, inputs_computed_vote_hash.len());
    assert(computed_vote_hash == vote_hash);
    let inputs_nullifier: [Field; 1] = [voter_secret];
    poseidon2::Poseidon2::hash(inputs_nullifier, inputs_nullifier.len())
}

#[test]
fn test_main() {
    let voter_secret = 1234;
    let vote = 1;
    let vote_hash = 0x1464a9cbfd07236e24bf9ea4036d527a5abcaf26e261c9aa90dbdbd72c19c109;
    let inputs_nullifier: [Field; 1] = [voter_secret];
    let expected_nullifier = poseidon2::Poseidon2::hash(inputs_nullifier, inputs_nullifier.len());
    let nullifier = main(voter_secret, vote, vote_hash);
    assert(nullifier == expected_nullifier);
}

#[test(should_fail)]
fn test_main_fail() {
    let voter_secret = 1234;
    let vote = 1;
    let vote_hash = 9224113572791893596618858998946281077226111653491833695978946049273159598346;
    let inputs_nullifier: [Field; 1] = [voter_secret];
    let expected_nullifier = poseidon2::Poseidon2::hash(inputs_nullifier, inputs_nullifier.len());
    let nullifier = main(voter_secret, vote, vote_hash);
    println(nullifier);
    assert(nullifier == expected_nullifier);
}
