import {Component, Editor} from 'grapesjs'

/**
 * Represents key modifiers.
 */
export enum KeyModifiers {
  MetaKey = 'meta',
  CtrlKey = 'ctrl',
  AltKey = 'alt',
  ShiftKey = 'shift'
}

/**
 * Represents the trigger scope of a keybinding.
 */
export type TriggerScope = {
  name: string,
  description: string,
  condition: (editor: Editor, event: KeyboardEvent) => boolean
}

export type TScopes = {
  [key: string]: TriggerScope
}

const TriggerScopes: TScopes = {
  GLOBAL: {
    name: 'Global',
    description: 'Applies everywhere in the editor.',
    condition: editor => true
  },
  GLOBAL_NO_TEXT_EDIT: {
    name: 'Global (Except Text Edition)',
    description: 'Applies everywhere but while editing text.',
    condition: (editor, event) => !TriggerScopes.TEXT_EDIT.condition(editor, event)
  },
  COMPONENT_SELECTION: {
    name: 'Component Selection',
    description: 'Applies when a component is selected.',
    condition: editor => !!editor.getSelected()
  },
  TEXT_EDIT: {
    name: 'Text Edition',
    description: 'Applies while editing text.',
    condition: (editor, event) => {
      const component: Component = editor.getEditing()
      const target = event.target as HTMLElement | null

      const richEditing: boolean = component !== undefined && component !== null
      const inTextInput: boolean = target && ['TEXTAREA', 'INPUT'].includes(target.tagName)

      return richEditing || inTextInput
    }
  }
}

/**
 * The key separator.
 */
const keySep: string = '+'

/**
 * The event namespace for this plugin.
 */
const eventName: string = 'keybind'

/**
 * A key (optionally associated with modifiers)
 * that triggers a GrapesJS command.
 * Having the modifiers to be a string helps filter out non-relevant keybindings.
 */
export type KeyBind = {
  key: string,
  modifiers: string,
  handler: ((editor: Editor) => void) | string,
  scope: TriggerScope,
  preventDefault: boolean,
}

/**
 * Contains all the registered keybindings.
 */
export const keybindsMap: Map<string, KeyBind> = new Map()

/**
 * Registers a keybinding.
 * Syntax for ``keys`` (if the separator is ``+``):
 * ```
 * <modifier1>+[<modifier2>+[<modifier3>]]+<key>
 * ```
 * Examples: ``ctrl+j``, ``p``, ``ctrl+alt+shift+t``, etc.
 */
export function setKeyBind(editor: Editor, keys: string, handler: ((editor: Editor) => void) | string, scope: TriggerScope = TriggerScopes.GLOBAL, preventDefault: boolean = true): KeyBind {
  const splitKeys = keys.toLowerCase().split(keySep)

  if (splitKeys.length > 0) {
    const key: string = splitKeys.pop()
    const modifiers: string = formattedModifiers(splitKeys)

    const keyBind: KeyBind = {key, modifiers, handler, scope, preventDefault}
    const entryKey: string = modifiers + keySep + key

    if (!keybindsMap.has(entryKey)) {
      editor.trigger(eventName + ':add')
    } else {
      editor.trigger(eventName + ':update')
    }

    keybindsMap.set(entryKey, keyBind)

    return keyBind
  } else {
    throw new Error('The keybinding \'' + keys + '\' is invalid.')
  }
}

export function removeKeyBind(editor, keys): boolean {
  const wasPresent: boolean = keybindsMap.delete(keys)

  if (wasPresent) editor.trigger(eventName + ':remove')

  return wasPresent
}

/**
 * Converts an array of modifiers into a standardized format
 * (order: ``meta`` > ``ctrl`` > ``alt`` > ``shift``).
 * @param modifiers The modifiers to order.
 */
function formattedModifiers(modifiers: string[]): string {
  const ordered: string[] = []

  modifiers.forEach(modifier => {
    switch (modifier.toLowerCase()) {
    case KeyModifiers.MetaKey:
      ordered.push(KeyModifiers.MetaKey)
      break
    case KeyModifiers.CtrlKey:
      ordered.push(KeyModifiers.CtrlKey)
      break
    case KeyModifiers.AltKey:
      ordered.push(KeyModifiers.AltKey)
      break
    case KeyModifiers.ShiftKey:
      ordered.push(KeyModifiers.ShiftKey)
      break
    default:
      throw new Error('The key modifier \'' + modifier + '\' is invalid.')
    }
  })

  return ordered.join(keySep)
}

function formattedModifiersFrom(event: KeyboardEvent): string {
  const modifiers: string[] = []

  event.metaKey && modifiers.push(KeyModifiers.MetaKey)
  event.ctrlKey && modifiers.push(KeyModifiers.CtrlKey)
  event.altKey && modifiers.push(KeyModifiers.AltKey)
  event.shiftKey && modifiers.push(KeyModifiers.ShiftKey)

  return modifiers.join(keySep)
}

/**
 * The function that initializes the keybindings' plugin.
 * It starts watching for registered keybindings.
 * @param editor The editor.
 */
export function keybindsPlugin(editor: Editor) {
  window.addEventListener('keydown', event => {
    const modifiers: string = formattedModifiersFrom(event)

    keybindsMap.forEach(keybind => {
      if (keybind.modifiers === modifiers && keybind.key === event.key.toLowerCase() && keybind.scope.condition(editor, event)) {
        const keyId: string = keybind.modifiers + keySep + keybind.key

        // We prevent the default behaviour
        if (keybind.preventDefault) event.preventDefault()

        // We run the command/execute the callback
        if (typeof keybind.handler === 'string') {
          editor.runCommand(keybind.handler)
        } else {
          keybind.handler(editor)
        }

        // We emit events
        editor.trigger(eventName + ':emit', keybind, event)
        editor.trigger(eventName + ':emit:' + keyId, keybind, event)
      }
    })
  })
}
