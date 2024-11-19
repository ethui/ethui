import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { type FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Form } from '@ethui/ui/components/form'
import { Button } from '@ethui/ui/components/shadcn/button'
import { useDialog } from '#/hooks/useDialog'

export const Route = createFileRoute('/dialog/_l/wallet-unlock/$id')({
  component: WalletUnlockDialog,
})

interface Request {
  name: string
  file: string
}

const schema = z.object({ password: z.string() })

function WalletUnlockDialog() {
  const { id } = Route.useParams()
  const { data, send, listen } = useDialog<Request>(id)
  const form = useForm({
    resolver: zodResolver(schema),
  })

  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(3)

  // listen to failure events
  useEffect(() => {
    const unlisten = listen('failed', () => {
      setAttempts(attempts - 1)
      setLoading(false)
    })

    return () => {
      unlisten.then((cb) => cb())
    }
  }, [attempts, listen])

  if (!data) return null

  const { name } = data

  const onSubmit = (data: FieldValues) => {
    send(data)
    setLoading(true)
  }

  return (
    <>
      <Form
        form={form}
        onSubmit={onSubmit}
        className="flex flex flex-col gap-4"
      >
        <div className="m-2 flex flex-col">
          <span>
            ethui is asking to unlock wallet <b>{name}:</b>
          </span>

          {/* TODO: how to re-add this?
          helperText={
              (attempts !== 3 &&
                `Incorrect password, ${attempts} attempts left`) ||
              ""
            }*/}
          <Form.Text label="Password" name="password" type="password" />
          <div className=" m-1 flex">
            <Form.Submit label="Unlock" />
            {!loading && (
              <Button color="error" onClick={() => send('reject')}>
                Cancel
              </Button>
            )}
            {loading && 'Unlocking...'}
          </div>
        </div>
      </Form>
    </>
  )
}
