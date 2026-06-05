use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("idx-file-update-datetime")
                    .table(File::Table)
                    .col(File::UpdateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-file-is-delete")
                    .table(File::Table)
                    .col(File::IsDelete)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-download-data-id")
                    .table(TaskDataDownload::Table)
                    .col(TaskDataDownload::DataId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-merge-data-id")
                    .table(TaskDataMerge::Table)
                    .col(TaskDataMerge::DataId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-id")
                    .table(Task::Table)
                    .col(Task::DataId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(Index::drop().name("idx-file-update-datetime").table(File::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-file-is-delete").table(File::Table).to_owned())
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx-task-data-download-data-id")
                    .table(TaskDataDownload::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx-task-data-merge-data-id")
                    .table(TaskDataMerge::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-data-id").table(Task::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum File {
    Table,
    Id,
    Name,
    Sha,
    Content,
    Size,
    IsDelete,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum Task {
    Table,
    Id,
    PlanId,
    Type,
    DataId,
    Status,
    ErrorReason,
    CostTime,
    RetryCount,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum TaskDataDownload {
    Table,
    Id,
    Type,
    UserName,
    RepoName,
    Datetime,
    Config,
    DataId,
    Seq,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum TaskDataMerge {
    Table,
    Id,
    Type,
    UserName,
    RepoName,
    Datetime,
    DataId,
    DataCount,
    Config,
    DataPageNum,
    DataPageSize,
    CreateDatetime,
    UpdateDatetime,
}
