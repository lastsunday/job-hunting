pub fn hash(text: &str) -> Result<String, bcrypt::BcryptError> {
    bcrypt::hash(text, bcrypt::DEFAULT_COST)
}

pub fn verify(text: &str, hash_text: &str) -> Result<bool, bcrypt::BcryptError> {
    bcrypt::verify(text, hash_text)
}

#[cfg(test)]
mod test {
    use crate::password::{hash, verify};

    #[test]
    fn test_hash() {
        let password = "Change_Me";
        let hash_result = hash(password).unwrap();
        assert!(verify(password, hash_result.as_str()).unwrap())
    }
}
