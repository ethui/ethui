import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_home/home/settings/networks/$name')({
  component: () => <div>Hello /_home/home/settings/networks/$name!</div>
})