use std::{
    sync::{Arc, OnceLock},
    thread,
    time::Duration,
};

use framework::is_true;
use tokio::runtime::Builder;
use tracing::debug;

use crate::{clap::Args, server::Server};

const WORKER_NAME: &str = "jh:worker";
const WORKER_MIN: usize = 2;
const WORKER_KEEPALIVE: u64 = 36;
const MAX_BLOCKING_THREADS: usize = 1024;
const SHUTDOWN_TIMEOUT: Duration = Duration::from_millis(10000);

static WORKER_AFFINITY: OnceLock<bool> = OnceLock::new();
static GC_ON_PARK: OnceLock<Option<bool>> = OnceLock::new();
static GC_MUZZY: OnceLock<Option<bool>> = OnceLock::new();

pub(super) fn new(args: &Args) -> Result<tokio::runtime::Runtime, anyhow::Error> {
    WORKER_AFFINITY
        .set(args.worker_affinity)
        .expect("set WORKER_AFFINITY from program argument");

    GC_ON_PARK
        .set(args.gc_on_park)
        .expect("set GC_ON_PARK from program argument");

    GC_MUZZY
        .set(args.gc_muzzy)
        .expect("set GC_MUZZY from program argument");

    let mut builder = Builder::new_multi_thread();
    builder
        .enable_io()
        .enable_time()
        .thread_name(WORKER_NAME)
        .worker_threads(args.worker_threads.max(WORKER_MIN))
        .max_blocking_threads(MAX_BLOCKING_THREADS)
        .thread_keep_alive(Duration::from_secs(WORKER_KEEPALIVE))
        .global_queue_interval(args.global_event_interval)
        .event_interval(args.kernel_event_interval)
        .max_io_events_per_tick(args.kernel_events_per_tick)
        .on_thread_start(thread_start)
        .on_thread_stop(thread_stop)
        .on_thread_unpark(thread_unpark)
        .on_thread_park(thread_park);

    builder.build().map_err(Into::into)
}

#[tracing::instrument(name = "stop", level = "info", skip_all)]
pub(super) fn shutdown(server: &Arc<Server>, runtime: tokio::runtime::Runtime) {
    wait_shutdown(server, runtime);
}

fn wait_shutdown(_server: &Arc<Server>, runtime: tokio::runtime::Runtime) {
    debug!(
        timeout = ?SHUTDOWN_TIMEOUT,
        "Waiting for runtime..."
    );

    runtime.shutdown_timeout(SHUTDOWN_TIMEOUT);
}

#[tracing::instrument(
	name = "fork",
	level = "debug",
	skip_all,
	fields(
		id = ?thread::current().id(),
		name = %thread::current().name().unwrap_or("None"),
	),
)]
fn thread_start() {
    debug_assert_eq!(
        Some(WORKER_NAME),
        thread::current().name(),
        "tokio worker name mismatch at thread start"
    );

    if WORKER_AFFINITY.get().is_some_and(is_true!()) {
        set_worker_affinity();
    }
}

fn set_worker_affinity() {
    // TODO: worker affinity not implement yet

    // static CORES_OCCUPIED: AtomicUsize = AtomicUsize::new(0);

    // let handle = tokio::runtime::Handle::current();
    // let num_workers = handle.metrics().num_workers();
    // let i = CORES_OCCUPIED.fetch_add(1, Ordering::Relaxed);
    // if i >= num_workers {
    //     return;
    // }

    // let Some(id) = nth_core_available(i) else {
    //     return;
    // };

    // set_affinity(once(id));
    // set_worker_mallctl(id);
}

#[tracing::instrument(
	name = "join",
	level = "debug",
	skip_all,
	fields(
		id = ?thread::current().id(),
		name = %thread::current().name().unwrap_or("None"),
	),
)]
fn thread_stop() {}

#[tracing::instrument(
	name = "work",
	level = "trace",
	skip_all,
	fields(
		id = ?thread::current().id(),
		name = %thread::current().name().unwrap_or("None"),
	),
)]
fn thread_unpark() {}

#[tracing::instrument(
	name = "park",
	level = "trace",
	skip_all,
	fields(
		id = ?thread::current().id(),
		name = %thread::current().name().unwrap_or("None"),
	),
)]
fn thread_park() {
    // TODO: thread_park not implement yet

    // match GC_ON_PARK
    //     .get()
    //     .as_ref()
    //     .expect("GC_ON_PARK initialized by runtime::new()")
    // {
    //     _ => (),
    // }
}

// fn gc_on_park() {}
