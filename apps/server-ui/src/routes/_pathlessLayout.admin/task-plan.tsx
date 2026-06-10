import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_pathlessLayout/admin/task-plan')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
