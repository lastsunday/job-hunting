use std::{cell::Cell, sync::LazyLock};

use crate::is_equal_to;

type Id = usize;
type Mask = u128;
const MASK_BITS: usize = 128;

/// The mask of logical cores available to the process (at startup).
static CORES_AVAILABLE: LazyLock<Mask> = LazyLock::new(|| into_mask(query_cores_available()));

thread_local! {
    /// Tracks the affinity for this thread. This is updated when affinities
    /// are set via our set_affinity() interface.
    static CORE_AFFINITY: Cell<Mask> = Cell::default();
}

/// Get the number of threads which could execute in parallel based on hardware
/// constraints of this system.
#[inline]
#[must_use]
pub fn available_parallelism() -> usize {
    cores_available().count()
}

/// Determine if core (by id) is available to the process.
#[inline]
#[must_use]
pub fn is_core_available(id: Id) -> bool {
    cores_available().any(is_equal_to!(id))
}

/// Gets the ID of the nth core available. This bijects our sequence of cores to
/// actual ID's which may have gaps for cores which are not available.
#[inline]
#[must_use]
pub fn nth_core_available(i: usize) -> Option<Id> {
    cores_available().nth(i)
}

/// Get the list of cores available. The values were recorded at program start.
#[inline]
pub fn cores_available() -> impl Iterator<Item = Id> {
    from_mask(*CORES_AVAILABLE)
}

fn query_cores_available() -> impl Iterator<Item = Id> {
    core_affinity::get_core_ids()
        .unwrap_or_default()
        .into_iter()
        .map(|core_id| core_id.id)
}

fn from_mask(v: Mask) -> impl Iterator<Item = Id> {
    (0..MASK_BITS).filter(move |&i| (v & (1 << i)) != 0)
}

fn into_mask<I>(ids: I) -> Mask
where
    I: Iterator<Item = Id>,
{
    ids.inspect(|&id| {
        debug_assert!(
            id < MASK_BITS,
            "Core ID must be < Mask::BITS at least for now"
        );
    })
    .fold(Mask::default(), |mask, id| mask | (1 << id))
}
