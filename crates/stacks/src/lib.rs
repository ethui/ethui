mod actor;
mod error;
mod init;

pub use error::{Error, Result};
pub use init::init;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
