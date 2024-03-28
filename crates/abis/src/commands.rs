use alloy_dyn_abi::{DynSolType, DynSolValue};
use serde::{ser::SerializeSeq, Serialize, Serializer};

#[derive(Debug)]
pub struct Encodable(DynSolValue);

#[tauri::command]
pub fn abi_parse_argument(r#type: &str, data: serde_json::Value) -> Result<Encodable, String> {
    let dyn_type: DynSolType = r#type.parse().unwrap();

    dyn_type
        .coerce_json(&data)
        .map(|v| Encodable(v))
        .map_err(|e| e.to_string())
}

impl Serialize for Encodable {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match &self.0 {
            DynSolValue::Bool(v) => v.serialize(serializer),
            DynSolValue::Int(v, _) => v.serialize(serializer),
            DynSolValue::Uint(v, _) => v.serialize(serializer),
            DynSolValue::FixedBytes(v, _) => v.serialize(serializer),
            DynSolValue::Address(v) => v.serialize(serializer),
            DynSolValue::Function(_) => unreachable!(),
            DynSolValue::Bytes(v) => v.serialize(serializer),
            DynSolValue::String(v) => v.serialize(serializer),
            DynSolValue::Array(v) => {
                let mut seq = serializer.serialize_seq(Some(v.len()))?;
                for elem in v.iter() {
                    seq.serialize_element(&Encodable(elem.clone()))?;
                }
                seq.end()
            }
            DynSolValue::FixedArray(v) => {
                let mut seq = serializer.serialize_seq(Some(v.len()))?;
                for elem in v.iter() {
                    seq.serialize_element(&Encodable(elem.clone()))?;
                }
                seq.end()
            }
            DynSolValue::Tuple(_) => todo!(),
            DynSolValue::CustomStruct {
                name,
                prop_names,
                tuple,
            } => todo!(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rstest::*;
    use serde_json::json;

    #[rstest]
    #[case("uint256", json!("1"), json!("0x1"))]
    #[case("string", json!("asd"), json!("asd"))]
    #[case("uint256[]", json!([1, 2, 3]), json!(["0x1", "0x2", "0x3"]))]
    #[case("uint256[][]", json!([[1, 2],[3, 4]]), json!([["0x1", "0x2"], ["0x3", "0x4"]]))]
    fn happy_path(
        #[case] r#type: &str,
        #[case] data: serde_json::Value,
        #[case] expected: serde_json::Value,
    ) -> anyhow::Result<()> {
        let r = serde_json::to_value(abiparser_parse_argument(r#type, data).unwrap())?;
        assert_eq!(r, expected);

        Ok(())
    }

    #[rstest]
    #[case("uint256", json!("asd"))]
    fn sad_path(#[case] r#type: &str, #[case] data: serde_json::Value) -> anyhow::Result<()> {
        let r = abiparser_parse_argument(r#type, data);

        assert!(r.is_err());

        Ok(())
    }
}
