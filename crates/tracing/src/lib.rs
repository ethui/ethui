use std::collections::BTreeMap;

use color_eyre::eyre::ContextCompat as _;
use once_cell::sync::OnceCell;
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt as _,
    reload,
    util::SubscriberInitExt as _,
    EnvFilter, Layer, Registry,
};

static RELOAD_HANDLE: OnceCell<reload::Handle<EnvFilter, Registry>> = OnceCell::new();

pub struct UITracingLayer;

impl<S> Layer<S> for UITracingLayer
where
    S: tracing::Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        dbg!("on_event");
        
        // Only propagate ERROR, WARN, INFO, and DEBUG to UI (not TRACE)
        match *event.metadata().level() {
            tracing::Level::ERROR | tracing::Level::WARN | tracing::Level::INFO | tracing::Level::DEBUG => {
                // Continue processing
            }
            tracing::Level::TRACE => return, // Skip TRACE level events
        }
        
        let mut fields = BTreeMap::new();
        let mut visitor = JsonVisitor(&mut fields);
        event.record(&mut visitor);

        let message = fields
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let trace_event = ethui_types::ui_events::TraceEvent {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: format!("{:?}", event.metadata().level()),
            target: event.metadata().target().to_string(),
            message,
            fields,
        };

        tokio::spawn(async move {
            let _ = ethui_broadcast::ui_notify(ethui_types::ui_events::UINotify::TraceEvent(
                trace_event,
            ))
            .await;
        });
    }
}

struct JsonVisitor<'a>(&'a mut BTreeMap<String, serde_json::Value>);

impl<'a> tracing::field::Visit for JsonVisitor<'a> {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::String(value.to_string()),
        );
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::String(format!("{value:?}")),
        );
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::Number(value.into()),
        );
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::Number(value.into()),
        );
    }

    fn record_bool(&mut self, field: &tracing::field::Field, value: bool) {
        self.0
            .insert(field.name().to_string(), serde_json::Value::Bool(value));
    }
}

pub fn init() -> color_eyre::Result<()> {
    let filter = EnvFilter::from_default_env();
    // .add_directive("ethui=info".parse().unwrap())
    // .add_directive("info".parse().unwrap());
    let (filter, reload_handle) = reload::Layer::new(filter);
    RELOAD_HANDLE.set(reload_handle).unwrap();

    let fmt = fmt::Layer::default()
        .with_ansi(true)
        .with_span_events(FmtSpan::CLOSE);

    let ui_layer = UITracingLayer;

    tracing_subscriber::registry()
        .with(filter)
        .with(ui_layer)
        .with(fmt)
        .init();

    Ok(())
}

pub fn parse(directives: &str) -> color_eyre::Result<EnvFilter> {
    Ok(EnvFilter::try_new(directives)?)
}

pub fn reload(directives: &str) -> color_eyre::Result<()> {
    let new_filter = parse(directives)?;

    RELOAD_HANDLE
        .get()
        .with_context(|| "Reload handle not set".to_string())?
        .modify(|filter| *filter = new_filter)?;

    Ok(())
}
