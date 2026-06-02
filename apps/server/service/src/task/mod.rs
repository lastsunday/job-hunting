pub mod download;
pub mod error;
pub mod merge;
pub mod plan;
pub mod scheduler;
pub mod utils;

pub use download::{
    calculate_and_create_download_task, execute_download_task_and_create_merge_task,
    CalculateAndCreateDownloadTaskParam, DateAndMaxSeq, DateForStartEndAndList,
    ExecuteDownloadTaskAndCreateMergeTaskParam, QueryDateListParam, SaveDataDownloadTaskParam,
    TaskAndDataId, TaskDataDownloadConfig, TaskType,
};
pub use error::Error;
pub use merge::{
    execute_merge_task, DataCount, ExecuteMergeTaskParam, TaskDataMergeConfig,
};
pub use plan::{
    create_plan, CreatePlanParam, RepoType, TaskPlanConfigDataDownloadConfig, Type,
};
pub use utils::get_file_name_by_task_type;

pub(crate) use utils::{
    apply_task_result, query_pending_tasks, query_plans_latest_datetime, MAX_POLL_INTERVAL,
};
