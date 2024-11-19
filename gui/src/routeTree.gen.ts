/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as OnboardingLImport } from './routes/onboarding/_l'
import { Route as HomeLImport } from './routes/home/_l'
import { Route as DialogLImport } from './routes/dialog/_l'
import { Route as OnboardingLIndexImport } from './routes/onboarding/_l/index'
import { Route as OnboardingLWalletImport } from './routes/onboarding/_l/wallet'
import { Route as OnboardingLThankYouImport } from './routes/onboarding/_l/thank-you'
import { Route as OnboardingLExtensionImport } from './routes/onboarding/_l/extension'
import { Route as OnboardingLAlchemyImport } from './routes/onboarding/_l/alchemy'
import { Route as HomeLTransactionsImport } from './routes/home/_l/transactions'
import { Route as HomeLContractsImport } from './routes/home/_l/contracts'
import { Route as HomeLConnectionsImport } from './routes/home/_l/connections'
import { Route as HomeLAccountImport } from './routes/home/_l/account'
import { Route as HomeLSettingsTokensImport } from './routes/home/_l/settings/tokens'
import { Route as HomeLSettingsKeybindsImport } from './routes/home/_l/settings/keybinds'
import { Route as HomeLSettingsGeneralImport } from './routes/home/_l/settings/general'
import { Route as HomeLSettingsFoundryImport } from './routes/home/_l/settings/foundry'
import { Route as DialogLWalletUnlockIdImport } from './routes/dialog/_l/wallet-unlock.$id'
import { Route as DialogLTxReviewIdImport } from './routes/dialog/_l/tx-review.$id'
import { Route as DialogLMsgSignIdImport } from './routes/dialog/_l/msg-sign.$id'
import { Route as DialogLErc721AddIdImport } from './routes/dialog/_l/erc721-add.$id'
import { Route as DialogLErc20AddIdImport } from './routes/dialog/_l/erc20-add.$id'
import { Route as DialogLErc1155AddIdImport } from './routes/dialog/_l/erc1155-add.$id'
import { Route as DialogLChainAddIdImport } from './routes/dialog/_l/chain-add.$id'
import { Route as HomeLSettingsWalletsIndexImport } from './routes/home/_l/settings/wallets/index'
import { Route as HomeLSettingsNetworksIndexImport } from './routes/home/_l/settings/networks/index'
import { Route as HomeLSettingsWalletsNewImport } from './routes/home/_l/settings/wallets/new'
import { Route as HomeLSettingsNetworksNewImport } from './routes/home/_l/settings/networks/new'
import { Route as HomeLSettingsWalletsNameEditImport } from './routes/home/_l/settings/wallets/$name.edit'
import { Route as HomeLSettingsNetworksNameEditImport } from './routes/home/_l/settings/networks/$name.edit'

// Create Virtual Routes

const OnboardingImport = createFileRoute('/onboarding')()
const HomeImport = createFileRoute('/home')()
const DialogImport = createFileRoute('/dialog')()

// Create/Update Routes

const OnboardingRoute = OnboardingImport.update({
  id: '/onboarding',
  path: '/onboarding',
  getParentRoute: () => rootRoute,
} as any)

const HomeRoute = HomeImport.update({
  id: '/home',
  path: '/home',
  getParentRoute: () => rootRoute,
} as any)

const DialogRoute = DialogImport.update({
  id: '/dialog',
  path: '/dialog',
  getParentRoute: () => rootRoute,
} as any)

const OnboardingLRoute = OnboardingLImport.update({
  id: '/_l',
  getParentRoute: () => OnboardingRoute,
} as any)

const HomeLRoute = HomeLImport.update({
  id: '/_l',
  getParentRoute: () => HomeRoute,
} as any)

const DialogLRoute = DialogLImport.update({
  id: '/_l',
  getParentRoute: () => DialogRoute,
} as any)

const OnboardingLIndexRoute = OnboardingLIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => OnboardingLRoute,
} as any)

const OnboardingLWalletRoute = OnboardingLWalletImport.update({
  id: '/wallet',
  path: '/wallet',
  getParentRoute: () => OnboardingLRoute,
} as any)

const OnboardingLThankYouRoute = OnboardingLThankYouImport.update({
  id: '/thank-you',
  path: '/thank-you',
  getParentRoute: () => OnboardingLRoute,
} as any)

const OnboardingLExtensionRoute = OnboardingLExtensionImport.update({
  id: '/extension',
  path: '/extension',
  getParentRoute: () => OnboardingLRoute,
} as any)

const OnboardingLAlchemyRoute = OnboardingLAlchemyImport.update({
  id: '/alchemy',
  path: '/alchemy',
  getParentRoute: () => OnboardingLRoute,
} as any)

const HomeLTransactionsRoute = HomeLTransactionsImport.update({
  id: '/transactions',
  path: '/transactions',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLContractsRoute = HomeLContractsImport.update({
  id: '/contracts',
  path: '/contracts',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLConnectionsRoute = HomeLConnectionsImport.update({
  id: '/connections',
  path: '/connections',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLAccountRoute = HomeLAccountImport.update({
  id: '/account',
  path: '/account',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsTokensRoute = HomeLSettingsTokensImport.update({
  id: '/settings/tokens',
  path: '/settings/tokens',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsKeybindsRoute = HomeLSettingsKeybindsImport.update({
  id: '/settings/keybinds',
  path: '/settings/keybinds',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsGeneralRoute = HomeLSettingsGeneralImport.update({
  id: '/settings/general',
  path: '/settings/general',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsFoundryRoute = HomeLSettingsFoundryImport.update({
  id: '/settings/foundry',
  path: '/settings/foundry',
  getParentRoute: () => HomeLRoute,
} as any)

const DialogLWalletUnlockIdRoute = DialogLWalletUnlockIdImport.update({
  id: '/wallet-unlock/$id',
  path: '/wallet-unlock/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLTxReviewIdRoute = DialogLTxReviewIdImport.update({
  id: '/tx-review/$id',
  path: '/tx-review/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLMsgSignIdRoute = DialogLMsgSignIdImport.update({
  id: '/msg-sign/$id',
  path: '/msg-sign/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLErc721AddIdRoute = DialogLErc721AddIdImport.update({
  id: '/erc721-add/$id',
  path: '/erc721-add/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLErc20AddIdRoute = DialogLErc20AddIdImport.update({
  id: '/erc20-add/$id',
  path: '/erc20-add/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLErc1155AddIdRoute = DialogLErc1155AddIdImport.update({
  id: '/erc1155-add/$id',
  path: '/erc1155-add/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const DialogLChainAddIdRoute = DialogLChainAddIdImport.update({
  id: '/chain-add/$id',
  path: '/chain-add/$id',
  getParentRoute: () => DialogLRoute,
} as any)

const HomeLSettingsWalletsIndexRoute = HomeLSettingsWalletsIndexImport.update({
  id: '/settings/wallets/',
  path: '/settings/wallets/',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsNetworksIndexRoute = HomeLSettingsNetworksIndexImport.update(
  {
    id: '/settings/networks/',
    path: '/settings/networks/',
    getParentRoute: () => HomeLRoute,
  } as any,
)

const HomeLSettingsWalletsNewRoute = HomeLSettingsWalletsNewImport.update({
  id: '/settings/wallets/new',
  path: '/settings/wallets/new',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsNetworksNewRoute = HomeLSettingsNetworksNewImport.update({
  id: '/settings/networks/new',
  path: '/settings/networks/new',
  getParentRoute: () => HomeLRoute,
} as any)

const HomeLSettingsWalletsNameEditRoute =
  HomeLSettingsWalletsNameEditImport.update({
    id: '/settings/wallets/$name/edit',
    path: '/settings/wallets/$name/edit',
    getParentRoute: () => HomeLRoute,
  } as any)

const HomeLSettingsNetworksNameEditRoute =
  HomeLSettingsNetworksNameEditImport.update({
    id: '/settings/networks/$name/edit',
    path: '/settings/networks/$name/edit',
    getParentRoute: () => HomeLRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/dialog': {
      id: '/dialog'
      path: '/dialog'
      fullPath: '/dialog'
      preLoaderRoute: typeof DialogImport
      parentRoute: typeof rootRoute
    }
    '/dialog/_l': {
      id: '/dialog/_l'
      path: '/dialog'
      fullPath: '/dialog'
      preLoaderRoute: typeof DialogLImport
      parentRoute: typeof DialogRoute
    }
    '/home': {
      id: '/home'
      path: '/home'
      fullPath: '/home'
      preLoaderRoute: typeof HomeImport
      parentRoute: typeof rootRoute
    }
    '/home/_l': {
      id: '/home/_l'
      path: '/home'
      fullPath: '/home'
      preLoaderRoute: typeof HomeLImport
      parentRoute: typeof HomeRoute
    }
    '/onboarding': {
      id: '/onboarding'
      path: '/onboarding'
      fullPath: '/onboarding'
      preLoaderRoute: typeof OnboardingImport
      parentRoute: typeof rootRoute
    }
    '/onboarding/_l': {
      id: '/onboarding/_l'
      path: '/onboarding'
      fullPath: '/onboarding'
      preLoaderRoute: typeof OnboardingLImport
      parentRoute: typeof OnboardingRoute
    }
    '/home/_l/account': {
      id: '/home/_l/account'
      path: '/account'
      fullPath: '/home/account'
      preLoaderRoute: typeof HomeLAccountImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/connections': {
      id: '/home/_l/connections'
      path: '/connections'
      fullPath: '/home/connections'
      preLoaderRoute: typeof HomeLConnectionsImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/contracts': {
      id: '/home/_l/contracts'
      path: '/contracts'
      fullPath: '/home/contracts'
      preLoaderRoute: typeof HomeLContractsImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/transactions': {
      id: '/home/_l/transactions'
      path: '/transactions'
      fullPath: '/home/transactions'
      preLoaderRoute: typeof HomeLTransactionsImport
      parentRoute: typeof HomeLImport
    }
    '/onboarding/_l/alchemy': {
      id: '/onboarding/_l/alchemy'
      path: '/alchemy'
      fullPath: '/onboarding/alchemy'
      preLoaderRoute: typeof OnboardingLAlchemyImport
      parentRoute: typeof OnboardingLImport
    }
    '/onboarding/_l/extension': {
      id: '/onboarding/_l/extension'
      path: '/extension'
      fullPath: '/onboarding/extension'
      preLoaderRoute: typeof OnboardingLExtensionImport
      parentRoute: typeof OnboardingLImport
    }
    '/onboarding/_l/thank-you': {
      id: '/onboarding/_l/thank-you'
      path: '/thank-you'
      fullPath: '/onboarding/thank-you'
      preLoaderRoute: typeof OnboardingLThankYouImport
      parentRoute: typeof OnboardingLImport
    }
    '/onboarding/_l/wallet': {
      id: '/onboarding/_l/wallet'
      path: '/wallet'
      fullPath: '/onboarding/wallet'
      preLoaderRoute: typeof OnboardingLWalletImport
      parentRoute: typeof OnboardingLImport
    }
    '/onboarding/_l/': {
      id: '/onboarding/_l/'
      path: '/'
      fullPath: '/onboarding/'
      preLoaderRoute: typeof OnboardingLIndexImport
      parentRoute: typeof OnboardingLImport
    }
    '/dialog/_l/chain-add/$id': {
      id: '/dialog/_l/chain-add/$id'
      path: '/chain-add/$id'
      fullPath: '/dialog/chain-add/$id'
      preLoaderRoute: typeof DialogLChainAddIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/erc1155-add/$id': {
      id: '/dialog/_l/erc1155-add/$id'
      path: '/erc1155-add/$id'
      fullPath: '/dialog/erc1155-add/$id'
      preLoaderRoute: typeof DialogLErc1155AddIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/erc20-add/$id': {
      id: '/dialog/_l/erc20-add/$id'
      path: '/erc20-add/$id'
      fullPath: '/dialog/erc20-add/$id'
      preLoaderRoute: typeof DialogLErc20AddIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/erc721-add/$id': {
      id: '/dialog/_l/erc721-add/$id'
      path: '/erc721-add/$id'
      fullPath: '/dialog/erc721-add/$id'
      preLoaderRoute: typeof DialogLErc721AddIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/msg-sign/$id': {
      id: '/dialog/_l/msg-sign/$id'
      path: '/msg-sign/$id'
      fullPath: '/dialog/msg-sign/$id'
      preLoaderRoute: typeof DialogLMsgSignIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/tx-review/$id': {
      id: '/dialog/_l/tx-review/$id'
      path: '/tx-review/$id'
      fullPath: '/dialog/tx-review/$id'
      preLoaderRoute: typeof DialogLTxReviewIdImport
      parentRoute: typeof DialogLImport
    }
    '/dialog/_l/wallet-unlock/$id': {
      id: '/dialog/_l/wallet-unlock/$id'
      path: '/wallet-unlock/$id'
      fullPath: '/dialog/wallet-unlock/$id'
      preLoaderRoute: typeof DialogLWalletUnlockIdImport
      parentRoute: typeof DialogLImport
    }
    '/home/_l/settings/foundry': {
      id: '/home/_l/settings/foundry'
      path: '/settings/foundry'
      fullPath: '/home/settings/foundry'
      preLoaderRoute: typeof HomeLSettingsFoundryImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/general': {
      id: '/home/_l/settings/general'
      path: '/settings/general'
      fullPath: '/home/settings/general'
      preLoaderRoute: typeof HomeLSettingsGeneralImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/keybinds': {
      id: '/home/_l/settings/keybinds'
      path: '/settings/keybinds'
      fullPath: '/home/settings/keybinds'
      preLoaderRoute: typeof HomeLSettingsKeybindsImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/tokens': {
      id: '/home/_l/settings/tokens'
      path: '/settings/tokens'
      fullPath: '/home/settings/tokens'
      preLoaderRoute: typeof HomeLSettingsTokensImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/networks/new': {
      id: '/home/_l/settings/networks/new'
      path: '/settings/networks/new'
      fullPath: '/home/settings/networks/new'
      preLoaderRoute: typeof HomeLSettingsNetworksNewImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/wallets/new': {
      id: '/home/_l/settings/wallets/new'
      path: '/settings/wallets/new'
      fullPath: '/home/settings/wallets/new'
      preLoaderRoute: typeof HomeLSettingsWalletsNewImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/networks/': {
      id: '/home/_l/settings/networks/'
      path: '/settings/networks'
      fullPath: '/home/settings/networks'
      preLoaderRoute: typeof HomeLSettingsNetworksIndexImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/wallets/': {
      id: '/home/_l/settings/wallets/'
      path: '/settings/wallets'
      fullPath: '/home/settings/wallets'
      preLoaderRoute: typeof HomeLSettingsWalletsIndexImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/networks/$name/edit': {
      id: '/home/_l/settings/networks/$name/edit'
      path: '/settings/networks/$name/edit'
      fullPath: '/home/settings/networks/$name/edit'
      preLoaderRoute: typeof HomeLSettingsNetworksNameEditImport
      parentRoute: typeof HomeLImport
    }
    '/home/_l/settings/wallets/$name/edit': {
      id: '/home/_l/settings/wallets/$name/edit'
      path: '/settings/wallets/$name/edit'
      fullPath: '/home/settings/wallets/$name/edit'
      preLoaderRoute: typeof HomeLSettingsWalletsNameEditImport
      parentRoute: typeof HomeLImport
    }
  }
}

// Create and export the route tree

interface DialogLRouteChildren {
  DialogLChainAddIdRoute: typeof DialogLChainAddIdRoute
  DialogLErc1155AddIdRoute: typeof DialogLErc1155AddIdRoute
  DialogLErc20AddIdRoute: typeof DialogLErc20AddIdRoute
  DialogLErc721AddIdRoute: typeof DialogLErc721AddIdRoute
  DialogLMsgSignIdRoute: typeof DialogLMsgSignIdRoute
  DialogLTxReviewIdRoute: typeof DialogLTxReviewIdRoute
  DialogLWalletUnlockIdRoute: typeof DialogLWalletUnlockIdRoute
}

const DialogLRouteChildren: DialogLRouteChildren = {
  DialogLChainAddIdRoute: DialogLChainAddIdRoute,
  DialogLErc1155AddIdRoute: DialogLErc1155AddIdRoute,
  DialogLErc20AddIdRoute: DialogLErc20AddIdRoute,
  DialogLErc721AddIdRoute: DialogLErc721AddIdRoute,
  DialogLMsgSignIdRoute: DialogLMsgSignIdRoute,
  DialogLTxReviewIdRoute: DialogLTxReviewIdRoute,
  DialogLWalletUnlockIdRoute: DialogLWalletUnlockIdRoute,
}

const DialogLRouteWithChildren =
  DialogLRoute._addFileChildren(DialogLRouteChildren)

interface DialogRouteChildren {
  DialogLRoute: typeof DialogLRouteWithChildren
}

const DialogRouteChildren: DialogRouteChildren = {
  DialogLRoute: DialogLRouteWithChildren,
}

const DialogRouteWithChildren =
  DialogRoute._addFileChildren(DialogRouteChildren)

interface HomeLRouteChildren {
  HomeLAccountRoute: typeof HomeLAccountRoute
  HomeLConnectionsRoute: typeof HomeLConnectionsRoute
  HomeLContractsRoute: typeof HomeLContractsRoute
  HomeLTransactionsRoute: typeof HomeLTransactionsRoute
  HomeLSettingsFoundryRoute: typeof HomeLSettingsFoundryRoute
  HomeLSettingsGeneralRoute: typeof HomeLSettingsGeneralRoute
  HomeLSettingsKeybindsRoute: typeof HomeLSettingsKeybindsRoute
  HomeLSettingsTokensRoute: typeof HomeLSettingsTokensRoute
  HomeLSettingsNetworksNewRoute: typeof HomeLSettingsNetworksNewRoute
  HomeLSettingsWalletsNewRoute: typeof HomeLSettingsWalletsNewRoute
  HomeLSettingsNetworksIndexRoute: typeof HomeLSettingsNetworksIndexRoute
  HomeLSettingsWalletsIndexRoute: typeof HomeLSettingsWalletsIndexRoute
  HomeLSettingsNetworksNameEditRoute: typeof HomeLSettingsNetworksNameEditRoute
  HomeLSettingsWalletsNameEditRoute: typeof HomeLSettingsWalletsNameEditRoute
}

const HomeLRouteChildren: HomeLRouteChildren = {
  HomeLAccountRoute: HomeLAccountRoute,
  HomeLConnectionsRoute: HomeLConnectionsRoute,
  HomeLContractsRoute: HomeLContractsRoute,
  HomeLTransactionsRoute: HomeLTransactionsRoute,
  HomeLSettingsFoundryRoute: HomeLSettingsFoundryRoute,
  HomeLSettingsGeneralRoute: HomeLSettingsGeneralRoute,
  HomeLSettingsKeybindsRoute: HomeLSettingsKeybindsRoute,
  HomeLSettingsTokensRoute: HomeLSettingsTokensRoute,
  HomeLSettingsNetworksNewRoute: HomeLSettingsNetworksNewRoute,
  HomeLSettingsWalletsNewRoute: HomeLSettingsWalletsNewRoute,
  HomeLSettingsNetworksIndexRoute: HomeLSettingsNetworksIndexRoute,
  HomeLSettingsWalletsIndexRoute: HomeLSettingsWalletsIndexRoute,
  HomeLSettingsNetworksNameEditRoute: HomeLSettingsNetworksNameEditRoute,
  HomeLSettingsWalletsNameEditRoute: HomeLSettingsWalletsNameEditRoute,
}

const HomeLRouteWithChildren = HomeLRoute._addFileChildren(HomeLRouteChildren)

interface HomeRouteChildren {
  HomeLRoute: typeof HomeLRouteWithChildren
}

const HomeRouteChildren: HomeRouteChildren = {
  HomeLRoute: HomeLRouteWithChildren,
}

const HomeRouteWithChildren = HomeRoute._addFileChildren(HomeRouteChildren)

interface OnboardingLRouteChildren {
  OnboardingLAlchemyRoute: typeof OnboardingLAlchemyRoute
  OnboardingLExtensionRoute: typeof OnboardingLExtensionRoute
  OnboardingLThankYouRoute: typeof OnboardingLThankYouRoute
  OnboardingLWalletRoute: typeof OnboardingLWalletRoute
  OnboardingLIndexRoute: typeof OnboardingLIndexRoute
}

const OnboardingLRouteChildren: OnboardingLRouteChildren = {
  OnboardingLAlchemyRoute: OnboardingLAlchemyRoute,
  OnboardingLExtensionRoute: OnboardingLExtensionRoute,
  OnboardingLThankYouRoute: OnboardingLThankYouRoute,
  OnboardingLWalletRoute: OnboardingLWalletRoute,
  OnboardingLIndexRoute: OnboardingLIndexRoute,
}

const OnboardingLRouteWithChildren = OnboardingLRoute._addFileChildren(
  OnboardingLRouteChildren,
)

interface OnboardingRouteChildren {
  OnboardingLRoute: typeof OnboardingLRouteWithChildren
}

const OnboardingRouteChildren: OnboardingRouteChildren = {
  OnboardingLRoute: OnboardingLRouteWithChildren,
}

const OnboardingRouteWithChildren = OnboardingRoute._addFileChildren(
  OnboardingRouteChildren,
)

export interface FileRoutesByFullPath {
  '/dialog': typeof DialogLRouteWithChildren
  '/home': typeof HomeLRouteWithChildren
  '/onboarding': typeof OnboardingLRouteWithChildren
  '/home/account': typeof HomeLAccountRoute
  '/home/connections': typeof HomeLConnectionsRoute
  '/home/contracts': typeof HomeLContractsRoute
  '/home/transactions': typeof HomeLTransactionsRoute
  '/onboarding/alchemy': typeof OnboardingLAlchemyRoute
  '/onboarding/extension': typeof OnboardingLExtensionRoute
  '/onboarding/thank-you': typeof OnboardingLThankYouRoute
  '/onboarding/wallet': typeof OnboardingLWalletRoute
  '/onboarding/': typeof OnboardingLIndexRoute
  '/dialog/chain-add/$id': typeof DialogLChainAddIdRoute
  '/dialog/erc1155-add/$id': typeof DialogLErc1155AddIdRoute
  '/dialog/erc20-add/$id': typeof DialogLErc20AddIdRoute
  '/dialog/erc721-add/$id': typeof DialogLErc721AddIdRoute
  '/dialog/msg-sign/$id': typeof DialogLMsgSignIdRoute
  '/dialog/tx-review/$id': typeof DialogLTxReviewIdRoute
  '/dialog/wallet-unlock/$id': typeof DialogLWalletUnlockIdRoute
  '/home/settings/foundry': typeof HomeLSettingsFoundryRoute
  '/home/settings/general': typeof HomeLSettingsGeneralRoute
  '/home/settings/keybinds': typeof HomeLSettingsKeybindsRoute
  '/home/settings/tokens': typeof HomeLSettingsTokensRoute
  '/home/settings/networks/new': typeof HomeLSettingsNetworksNewRoute
  '/home/settings/wallets/new': typeof HomeLSettingsWalletsNewRoute
  '/home/settings/networks': typeof HomeLSettingsNetworksIndexRoute
  '/home/settings/wallets': typeof HomeLSettingsWalletsIndexRoute
  '/home/settings/networks/$name/edit': typeof HomeLSettingsNetworksNameEditRoute
  '/home/settings/wallets/$name/edit': typeof HomeLSettingsWalletsNameEditRoute
}

export interface FileRoutesByTo {
  '/dialog': typeof DialogLRouteWithChildren
  '/home': typeof HomeLRouteWithChildren
  '/onboarding': typeof OnboardingLIndexRoute
  '/home/account': typeof HomeLAccountRoute
  '/home/connections': typeof HomeLConnectionsRoute
  '/home/contracts': typeof HomeLContractsRoute
  '/home/transactions': typeof HomeLTransactionsRoute
  '/onboarding/alchemy': typeof OnboardingLAlchemyRoute
  '/onboarding/extension': typeof OnboardingLExtensionRoute
  '/onboarding/thank-you': typeof OnboardingLThankYouRoute
  '/onboarding/wallet': typeof OnboardingLWalletRoute
  '/dialog/chain-add/$id': typeof DialogLChainAddIdRoute
  '/dialog/erc1155-add/$id': typeof DialogLErc1155AddIdRoute
  '/dialog/erc20-add/$id': typeof DialogLErc20AddIdRoute
  '/dialog/erc721-add/$id': typeof DialogLErc721AddIdRoute
  '/dialog/msg-sign/$id': typeof DialogLMsgSignIdRoute
  '/dialog/tx-review/$id': typeof DialogLTxReviewIdRoute
  '/dialog/wallet-unlock/$id': typeof DialogLWalletUnlockIdRoute
  '/home/settings/foundry': typeof HomeLSettingsFoundryRoute
  '/home/settings/general': typeof HomeLSettingsGeneralRoute
  '/home/settings/keybinds': typeof HomeLSettingsKeybindsRoute
  '/home/settings/tokens': typeof HomeLSettingsTokensRoute
  '/home/settings/networks/new': typeof HomeLSettingsNetworksNewRoute
  '/home/settings/wallets/new': typeof HomeLSettingsWalletsNewRoute
  '/home/settings/networks': typeof HomeLSettingsNetworksIndexRoute
  '/home/settings/wallets': typeof HomeLSettingsWalletsIndexRoute
  '/home/settings/networks/$name/edit': typeof HomeLSettingsNetworksNameEditRoute
  '/home/settings/wallets/$name/edit': typeof HomeLSettingsWalletsNameEditRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/dialog': typeof DialogRouteWithChildren
  '/dialog/_l': typeof DialogLRouteWithChildren
  '/home': typeof HomeRouteWithChildren
  '/home/_l': typeof HomeLRouteWithChildren
  '/onboarding': typeof OnboardingRouteWithChildren
  '/onboarding/_l': typeof OnboardingLRouteWithChildren
  '/home/_l/account': typeof HomeLAccountRoute
  '/home/_l/connections': typeof HomeLConnectionsRoute
  '/home/_l/contracts': typeof HomeLContractsRoute
  '/home/_l/transactions': typeof HomeLTransactionsRoute
  '/onboarding/_l/alchemy': typeof OnboardingLAlchemyRoute
  '/onboarding/_l/extension': typeof OnboardingLExtensionRoute
  '/onboarding/_l/thank-you': typeof OnboardingLThankYouRoute
  '/onboarding/_l/wallet': typeof OnboardingLWalletRoute
  '/onboarding/_l/': typeof OnboardingLIndexRoute
  '/dialog/_l/chain-add/$id': typeof DialogLChainAddIdRoute
  '/dialog/_l/erc1155-add/$id': typeof DialogLErc1155AddIdRoute
  '/dialog/_l/erc20-add/$id': typeof DialogLErc20AddIdRoute
  '/dialog/_l/erc721-add/$id': typeof DialogLErc721AddIdRoute
  '/dialog/_l/msg-sign/$id': typeof DialogLMsgSignIdRoute
  '/dialog/_l/tx-review/$id': typeof DialogLTxReviewIdRoute
  '/dialog/_l/wallet-unlock/$id': typeof DialogLWalletUnlockIdRoute
  '/home/_l/settings/foundry': typeof HomeLSettingsFoundryRoute
  '/home/_l/settings/general': typeof HomeLSettingsGeneralRoute
  '/home/_l/settings/keybinds': typeof HomeLSettingsKeybindsRoute
  '/home/_l/settings/tokens': typeof HomeLSettingsTokensRoute
  '/home/_l/settings/networks/new': typeof HomeLSettingsNetworksNewRoute
  '/home/_l/settings/wallets/new': typeof HomeLSettingsWalletsNewRoute
  '/home/_l/settings/networks/': typeof HomeLSettingsNetworksIndexRoute
  '/home/_l/settings/wallets/': typeof HomeLSettingsWalletsIndexRoute
  '/home/_l/settings/networks/$name/edit': typeof HomeLSettingsNetworksNameEditRoute
  '/home/_l/settings/wallets/$name/edit': typeof HomeLSettingsWalletsNameEditRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/dialog'
    | '/home'
    | '/onboarding'
    | '/home/account'
    | '/home/connections'
    | '/home/contracts'
    | '/home/transactions'
    | '/onboarding/alchemy'
    | '/onboarding/extension'
    | '/onboarding/thank-you'
    | '/onboarding/wallet'
    | '/onboarding/'
    | '/dialog/chain-add/$id'
    | '/dialog/erc1155-add/$id'
    | '/dialog/erc20-add/$id'
    | '/dialog/erc721-add/$id'
    | '/dialog/msg-sign/$id'
    | '/dialog/tx-review/$id'
    | '/dialog/wallet-unlock/$id'
    | '/home/settings/foundry'
    | '/home/settings/general'
    | '/home/settings/keybinds'
    | '/home/settings/tokens'
    | '/home/settings/networks/new'
    | '/home/settings/wallets/new'
    | '/home/settings/networks'
    | '/home/settings/wallets'
    | '/home/settings/networks/$name/edit'
    | '/home/settings/wallets/$name/edit'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/dialog'
    | '/home'
    | '/onboarding'
    | '/home/account'
    | '/home/connections'
    | '/home/contracts'
    | '/home/transactions'
    | '/onboarding/alchemy'
    | '/onboarding/extension'
    | '/onboarding/thank-you'
    | '/onboarding/wallet'
    | '/dialog/chain-add/$id'
    | '/dialog/erc1155-add/$id'
    | '/dialog/erc20-add/$id'
    | '/dialog/erc721-add/$id'
    | '/dialog/msg-sign/$id'
    | '/dialog/tx-review/$id'
    | '/dialog/wallet-unlock/$id'
    | '/home/settings/foundry'
    | '/home/settings/general'
    | '/home/settings/keybinds'
    | '/home/settings/tokens'
    | '/home/settings/networks/new'
    | '/home/settings/wallets/new'
    | '/home/settings/networks'
    | '/home/settings/wallets'
    | '/home/settings/networks/$name/edit'
    | '/home/settings/wallets/$name/edit'
  id:
    | '__root__'
    | '/dialog'
    | '/dialog/_l'
    | '/home'
    | '/home/_l'
    | '/onboarding'
    | '/onboarding/_l'
    | '/home/_l/account'
    | '/home/_l/connections'
    | '/home/_l/contracts'
    | '/home/_l/transactions'
    | '/onboarding/_l/alchemy'
    | '/onboarding/_l/extension'
    | '/onboarding/_l/thank-you'
    | '/onboarding/_l/wallet'
    | '/onboarding/_l/'
    | '/dialog/_l/chain-add/$id'
    | '/dialog/_l/erc1155-add/$id'
    | '/dialog/_l/erc20-add/$id'
    | '/dialog/_l/erc721-add/$id'
    | '/dialog/_l/msg-sign/$id'
    | '/dialog/_l/tx-review/$id'
    | '/dialog/_l/wallet-unlock/$id'
    | '/home/_l/settings/foundry'
    | '/home/_l/settings/general'
    | '/home/_l/settings/keybinds'
    | '/home/_l/settings/tokens'
    | '/home/_l/settings/networks/new'
    | '/home/_l/settings/wallets/new'
    | '/home/_l/settings/networks/'
    | '/home/_l/settings/wallets/'
    | '/home/_l/settings/networks/$name/edit'
    | '/home/_l/settings/wallets/$name/edit'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  DialogRoute: typeof DialogRouteWithChildren
  HomeRoute: typeof HomeRouteWithChildren
  OnboardingRoute: typeof OnboardingRouteWithChildren
}

const rootRouteChildren: RootRouteChildren = {
  DialogRoute: DialogRouteWithChildren,
  HomeRoute: HomeRouteWithChildren,
  OnboardingRoute: OnboardingRouteWithChildren,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/dialog",
        "/home",
        "/onboarding"
      ]
    },
    "/dialog": {
      "filePath": "dialog",
      "children": [
        "/dialog/_l"
      ]
    },
    "/dialog/_l": {
      "filePath": "dialog/_l.tsx",
      "parent": "/dialog",
      "children": [
        "/dialog/_l/chain-add/$id",
        "/dialog/_l/erc1155-add/$id",
        "/dialog/_l/erc20-add/$id",
        "/dialog/_l/erc721-add/$id",
        "/dialog/_l/msg-sign/$id",
        "/dialog/_l/tx-review/$id",
        "/dialog/_l/wallet-unlock/$id"
      ]
    },
    "/home": {
      "filePath": "home",
      "children": [
        "/home/_l"
      ]
    },
    "/home/_l": {
      "filePath": "home/_l.tsx",
      "parent": "/home",
      "children": [
        "/home/_l/account",
        "/home/_l/connections",
        "/home/_l/contracts",
        "/home/_l/transactions",
        "/home/_l/settings/foundry",
        "/home/_l/settings/general",
        "/home/_l/settings/keybinds",
        "/home/_l/settings/tokens",
        "/home/_l/settings/networks/new",
        "/home/_l/settings/wallets/new",
        "/home/_l/settings/networks/",
        "/home/_l/settings/wallets/",
        "/home/_l/settings/networks/$name/edit",
        "/home/_l/settings/wallets/$name/edit"
      ]
    },
    "/onboarding": {
      "filePath": "onboarding",
      "children": [
        "/onboarding/_l"
      ]
    },
    "/onboarding/_l": {
      "filePath": "onboarding/_l.tsx",
      "parent": "/onboarding",
      "children": [
        "/onboarding/_l/alchemy",
        "/onboarding/_l/extension",
        "/onboarding/_l/thank-you",
        "/onboarding/_l/wallet",
        "/onboarding/_l/"
      ]
    },
    "/home/_l/account": {
      "filePath": "home/_l/account.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/connections": {
      "filePath": "home/_l/connections.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/contracts": {
      "filePath": "home/_l/contracts.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/transactions": {
      "filePath": "home/_l/transactions.tsx",
      "parent": "/home/_l"
    },
    "/onboarding/_l/alchemy": {
      "filePath": "onboarding/_l/alchemy.tsx",
      "parent": "/onboarding/_l"
    },
    "/onboarding/_l/extension": {
      "filePath": "onboarding/_l/extension.tsx",
      "parent": "/onboarding/_l"
    },
    "/onboarding/_l/thank-you": {
      "filePath": "onboarding/_l/thank-you.tsx",
      "parent": "/onboarding/_l"
    },
    "/onboarding/_l/wallet": {
      "filePath": "onboarding/_l/wallet.tsx",
      "parent": "/onboarding/_l"
    },
    "/onboarding/_l/": {
      "filePath": "onboarding/_l/index.tsx",
      "parent": "/onboarding/_l"
    },
    "/dialog/_l/chain-add/$id": {
      "filePath": "dialog/_l/chain-add.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/erc1155-add/$id": {
      "filePath": "dialog/_l/erc1155-add.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/erc20-add/$id": {
      "filePath": "dialog/_l/erc20-add.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/erc721-add/$id": {
      "filePath": "dialog/_l/erc721-add.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/msg-sign/$id": {
      "filePath": "dialog/_l/msg-sign.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/tx-review/$id": {
      "filePath": "dialog/_l/tx-review.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/dialog/_l/wallet-unlock/$id": {
      "filePath": "dialog/_l/wallet-unlock.$id.tsx",
      "parent": "/dialog/_l"
    },
    "/home/_l/settings/foundry": {
      "filePath": "home/_l/settings/foundry.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/general": {
      "filePath": "home/_l/settings/general.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/keybinds": {
      "filePath": "home/_l/settings/keybinds.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/tokens": {
      "filePath": "home/_l/settings/tokens.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/networks/new": {
      "filePath": "home/_l/settings/networks/new.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/wallets/new": {
      "filePath": "home/_l/settings/wallets/new.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/networks/": {
      "filePath": "home/_l/settings/networks/index.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/wallets/": {
      "filePath": "home/_l/settings/wallets/index.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/networks/$name/edit": {
      "filePath": "home/_l/settings/networks/$name.edit.tsx",
      "parent": "/home/_l"
    },
    "/home/_l/settings/wallets/$name/edit": {
      "filePath": "home/_l/settings/wallets/$name.edit.tsx",
      "parent": "/home/_l"
    }
  }
}
ROUTE_MANIFEST_END */
