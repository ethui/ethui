use alloy_dyn_abi::{DynSolType, DynSolValue};
use serde::{ser::SerializeSeq, Serialize, Serializer};

#[derive(Debug)]
pub struct Encodable(DynSolValue);

#[tauri::command]
pub fn abi_parse_argument(r#type: &str, data: serde_json::Value) -> Result<Encodable, String> {
    dbg!(&data);
    match r#type.parse::<DynSolType>() {
        Ok(dyn_type) => dyn_type
            .coerce_json(&data)
            .map(Encodable)
            .map_err(|e| e.to_string()),
        Err(e) => Err(format!("Failed to parse type: {}", e)),
    }
}

impl Serialize for Encodable {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match &self.0 {
            DynSolValue::Bool(v) => v.serialize(serializer),
            DynSolValue::Int(v, _) => v.serialize(serializer),
            DynSolValue::Uint(v, _) => v.serialize(serializer),
            DynSolValue::FixedBytes(v, _) => v.serialize(serializer),
            DynSolValue::Address(v) => v.serialize(serializer),
            DynSolValue::Function(_) => {
                unreachable!("we only expect to parse function arguments and responses")
            }
            DynSolValue::Bytes(v) => v.serialize(serializer),
            DynSolValue::String(v) => v.serialize(serializer),
            DynSolValue::Array(v)
            | DynSolValue::FixedArray(v)
            | DynSolValue::Tuple(v)
            | DynSolValue::CustomStruct { tuple: v, .. } => {
                let mut seq = serializer.serialize_seq(Some(v.len()))?;
                for elem in v.iter() {
                    seq.serialize_element(&Encodable(elem.clone()))?;
                }
                seq.end()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use rstest::*;
    use serde_json::json;

    use super::*;

    #[rstest]
    #[case("uint256", json!("1"), json!("0x1"))]
    #[case("string", json!("asd"), json!("asd"))]
    #[case("address", json!("0xe592427a0aece92de3edee1f18e0157c05861564"), json!("0xe592427a0aece92de3edee1f18e0157c05861564"))]
    #[case("address", json!("e592427a0aece92de3edee1f18e0157c05861564"), json!("0xe592427a0aece92de3edee1f18e0157c05861564"))]
    #[case("bytes32", json!("0x03"), json!("0x0300000000000000000000000000000000000000000000000000000000000000"))]
    #[case("uint256[]", json!([1, 2, 3]), json!(["0x1", "0x2", "0x3"]))]
    #[case("uint256[3]", json!([1, 2, 3]), json!(["0x1", "0x2", "0x3"]))]
    #[case("uint256[][]", json!([[1, 2],[3, 4]]), json!([["0x1", "0x2"], ["0x3", "0x4"]]))]
    #[case("(string,uint256)", json!(["asd", 2]), json!(["asd", "0x2"]))]
    #[case("(string,uint256[2])", json!(["asd", [1,2]]), json!(["asd", ["0x1", "0x2"]]))]
    fn happy_path(
        #[case] r#type: &str,
        #[case] data: serde_json::Value,
        #[case] expected: serde_json::Value,
    ) -> anyhow::Result<()> {
        let r = serde_json::to_value(abi_parse_argument(r#type, data).unwrap())?;
        assert_eq!(r, expected);

        Ok(())
    }

    #[rstest]
    #[case("uint256", json!("asd"))]
    fn sad_path(#[case] r#type: &str, #[case] data: serde_json::Value) -> anyhow::Result<()> {
        let r = abi_parse_argument(r#type, data);

        assert!(r.is_err());

        Ok(())
    }
}
