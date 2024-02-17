import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/Root')({
  component: () => <div>Hello /Root!</div>
})