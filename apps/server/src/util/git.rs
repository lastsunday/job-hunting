use ssh_key::{rand_core::OsRng, Algorithm, LineEnding, PrivateKey};

pub fn gen_openssh_key() -> (String, String) {
    let private_key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519).unwrap();
    (
        private_key
            .to_openssh(LineEnding::CRLF)
            .unwrap()
            .to_string(),
        private_key.public_key().to_openssh().unwrap().to_string(),
    )
}

#[tokio::test]
async fn test_gen_ed25519_openssh() {
    let (private_key, public_key) = gen_openssh_key();
    println!("ed25519 openssh private key : \n{}", private_key);
    println!("ed25519 openssh public key : \n{}", public_key);
}