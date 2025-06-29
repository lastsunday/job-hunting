import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  Outlet,
  createRootRouteWithContext
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AuthContext } from '../hooks/auth'

export const Route = createRootRouteWithContext<{
  auth: AuthContext
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  return <>
    <Outlet />
    <ReactQueryDevtools buttonPosition="bottom-right" />
    <TanStackRouterDevtools position="bottom-right" />
  </>
} 
