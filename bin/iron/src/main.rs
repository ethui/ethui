use iron_lib::error::AppResult;

#[tokio::main]
async fn main() -> AppResult<()> {
    iron_lib::run()
}
