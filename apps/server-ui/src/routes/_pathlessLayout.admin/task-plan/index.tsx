import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_pathlessLayout/admin/task-plan/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/admin/task-plan/data-plan" replace />;
}
