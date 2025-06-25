pub fn gen_id() -> String {
    xid::new().to_string()
}

#[cfg(test)]
mod test {
    use crate::id::gen_id;

    #[test]
    fn test_gen_id() {
        let id = gen_id();
        assert!(!id.is_empty());
    }
}
