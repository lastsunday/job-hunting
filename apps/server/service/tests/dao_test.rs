use entity::job::{self, ActiveModel, Entity as Job};
use sea_orm::{EntityTrait, PaginatorTrait, QueryOrder, Set};
mod common;
use chrono::{Duration, Utc};
use common::{setup_database, tear_down};

#[tokio::test]
async fn test_find_by_id() {
    let (container, state) = setup_database().await;
    Job::insert(ActiveModel {
        id: Set("1".to_owned()),
        ..Default::default()
    })
    .exec(&state.conn)
    .await
    .unwrap();
    let job: Option<job::Model> = Job::find_by_id("1").one(&state.conn).await.unwrap();
    assert!(job.is_some());
    let _ = &state.conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_page() {
    let (container, state) = setup_database().await;
    let now = Utc::now().fixed_offset();
    for i in 1..101 {
        let dt = (now + Duration::seconds(i)).fixed_offset();
        Job::insert(ActiveModel {
            id: Set(i.to_string().to_owned()),
            update_datetime: Set(Some(dt)),
            ..Default::default()
        })
        .exec(&state.conn)
        .await
        .unwrap();
    }
    let selection = Job::find();
    let paginate = selection
        .order_by_desc(job::Column::UpdateDatetime)
        .order_by_asc(job::Column::Id)
        .paginate(&state.conn, 10);
    let selection = Job::find();
    let total = selection.count(&state.conn).await.unwrap();
    assert_eq!(total, 100, "total not equal {}", 100);
    let result = paginate.fetch_page(0).await;
    assert!(result.is_ok());
    let items = result.unwrap();
    assert_eq!(items.len(), 10, "page result not equal {}", 10);
    let _ = &state.conn.close().await;
    tear_down(&container).await;
}
