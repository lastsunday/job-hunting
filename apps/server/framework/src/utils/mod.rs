pub mod sys;

#[inline]
pub fn exchange<T>(state: &mut T, source: T) -> T {
    std::mem::replace(state, source)
}

#[macro_export]
macro_rules! extract_variant {
	( $e:expr_2021, $( $variant:path )|* ) => {
		match $e {
			$( $variant(value) => Some(value), )*
			_ => None,
		}
	};
}

/// Functor for !is_empty()
#[macro_export]
macro_rules! is_not_empty {
    () => {
        |x| !x.is_empty()
    };
}

#[macro_export]
macro_rules! apply {
	(1, $($idx:tt)+) => {
		|t| (($($idx)+)(t.0),)
	};

	(2, $($idx:tt)+) => {
		|t| (($($idx)+)(t.0), ($($idx)+)(t.1),)
	};

	(3, $($idx:tt)+) => {
		|t| (($($idx)+)(t.0), ($($idx)+)(t.1), ($($idx)+)(t.2),)
	};

	(4, $($idx:tt)+) => {
		|t| (($($idx)+)(t.0), ($($idx)+)(t.1), ($($idx)+)(t.2), ($($idx)+4)(t.3))
	};
}

#[macro_export]
macro_rules! pair_of {
    ($decl:ty) => {
        ($decl, $decl)
    };

    ($init:expr_2021) => {
        ($init, $init)
    };
}

/// Functor for truthy
#[macro_export]
macro_rules! is_true {
    () => {
        |x| !!x
    };
}

/// Functor for falsy
#[macro_export]
macro_rules! is_false {
    () => {
        |x| !x
    };
}

/// Functor for equality to non-zero
#[macro_export]
macro_rules! is_nonzero {
    () => {
        |x| x != 0
    };
}

/// Functor for equality to zero
#[macro_export]
macro_rules! is_zero {
    () => {
        $crate::is_matching!(0)
    };
}

/// Functor for equality i.e. .is_some_and(is_equal!(2))
#[macro_export]
macro_rules! is_equal_to {
    ($val:ident) => {
        |x| x == $val
    };

    ($val:expr_2021) => {
        |x| x == $val
    };
}

/// Functor for less i.e. .is_some_and(is_less_than!(2))
#[macro_export]
macro_rules! is_less_than {
    ($val:ident) => {
        |x| x < $val
    };

    ($val:expr_2021) => {
        |x| x < $val
    };
}

/// Functor for matches! i.e. .is_some_and(is_matching!('A'..='Z'))
#[macro_export]
macro_rules! is_matching {
	($val:ident) => {
		|x| matches!(x, $val)
	};

	($($val:tt)+) => {
		|x| matches!(x, $($val)+)
	};
}

/// Functor for equality i.e. (a, b).map(is_equal!())
#[macro_export]
macro_rules! is_equal {
    () => {
        |a, b| a == b
    };
}

/// Functor for |x| *x.$i
#[macro_export]
macro_rules! deref_at {
    ($idx:tt) => {
        |t| *t.$idx
    };
}

/// Functor for |ref x| x.$i
#[macro_export]
macro_rules! ref_at {
    ($idx:tt) => {
        |ref t| &t.$idx
    };
}

/// Functor for |&x| x.$i
#[macro_export]
macro_rules! val_at {
    ($idx:tt) => {
        |&t| t.$idx
    };
}

/// Functor for |x| x.$i
#[macro_export]
macro_rules! at {
    ($idx:tt) => {
        |t| t.$idx
    };
}
