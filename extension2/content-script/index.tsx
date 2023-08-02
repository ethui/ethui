import React from 'react'
import ReactDOM from 'react-dom/client'

import manifest from '../public/manifest.json' assert { type: 'json' }

import App from './component.jsx'
import './index.css'

console.debug(`Initiate Web Extension v${manifest.version}`)

const pluginTagId = 'extension-root'
const existingInstance = document.getElementById(pluginTagId)
if (existingInstance) {
  console.debug('existing instance found, removing')
  existingInstance.remove()
}

const component = document.createElement('div')
component.setAttribute('id', pluginTagId)

// Make sure the element that you want to mount the app to has loaded. You can
// also use `append` or insert the app using another method:
// https://developer.mozilla.org/en-US/docs/Web/API/Element#methods
//
// Also control when the content script is injected from the manifest.json:
// https://developer.chrome.com/docs/extensions/mv3/content_scripts/#run_time
document.body.append(component)
ReactDOM.createRoot(component).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
