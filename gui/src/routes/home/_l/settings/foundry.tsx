import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { AppNavbar } from '#/components/AppNavbar'

import { invoke } from '@tauri-apps/api/core'
import { useCallback } from 'react'
import { type FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Form } from '@ethui/ui/components/form'
import { useSettings } from '#/store/useSettings'

export const Route = createFileRoute('/home/_l/settings/foundry')({
  component: () => (
    <>
      <AppNavbar title="Settings » Foundry" />
      <div className="m-4">
        <SettingsFoundry />
      </div>
    </>
  ),
})

const schema = z.object({
  abiWatchPath: z.string().optional().nullable(),
})

function SettingsFoundry() {
  const general = useSettings((s) => s.settings)

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues: general,
  })

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke('settings_set', {
        params,
      })
      form.reset(params)
    },
    [form],
  )

  if (!general) return null

  return (
    <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      <span>
        ethui can monitor your filesystem for foundry projects, indexing the
        output ABIs automatically.
      </span>

      <Form.Text
        name="abiWatchPath"
        label="ABI Watch path"
        className="w-full"
      />
      <Form.Submit label="Save" />
    </Form>
  )
}
