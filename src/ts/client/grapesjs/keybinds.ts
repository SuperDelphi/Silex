import { Editor } from 'grapesjs'

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
export enum TriggerScope {

}

/**
 * A key (optionally associated with modifiers)
 * that triggers a GrapesJS command.
 * Having the modifiers to be a string helps filter out non-relevant keybindings.
 */
export type KeyBind = {
  key: string,
  modifiers: string,
  command: string
}

/**
 * Contains all the registered keybindings.
 */
export const keyBindsMap: Map<string, KeyBind> = new Map()

/**
 * Registers a keybinding.
 * Syntax for ``keys``:
 * ```
 * <modifier1> [<modifier2> [<modifier3>]] <key>
 * ```
 * Examples: ``ctrl j``, ``p``, ``ctrl alt shift t``, etc.
 */
export function setKeyBind(keys: string, command: string): KeyBind {
  const splitKeys = keys.toLowerCase().split(' ')

  if (splitKeys.length > 0) {
    const key: string = splitKeys.pop()
    const modifiers: string = formattedModifiers(splitKeys)

    const keyBind: KeyBind = {key, modifiers, command}
    keyBindsMap.set(modifiers + ' ' + key, keyBind)
    console.log(keyBind)

    return keyBind
  } else {
    throw new Error('The keybinding \'' + keys + '\' is invalid.')
  }
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

  return ordered.join(' ')
}

function formattedModifiersFrom(event: KeyboardEvent): string {
  const modifiers: string[] = []

  event.metaKey && modifiers.push(KeyModifiers.MetaKey)
  event.ctrlKey && modifiers.push(KeyModifiers.CtrlKey)
  event.altKey && modifiers.push(KeyModifiers.AltKey)
  event.shiftKey && modifiers.push(KeyModifiers.ShiftKey)

  return modifiers.join(' ')
}

/**
 * The function that initializes the keybindings' plugin.
 * @param editor The editor.
 */
export function keybindsPlugin(editor: Editor) {
  // TODO: Remove tests
  setKeyBind('ctrl d', 'core:component-delete')

  window.addEventListener('keydown', event => {
    const modifiers: string = formattedModifiersFrom(event)

    keyBindsMap.forEach(keybind => {
      console.log(event.key + '(' + modifiers + ')')

      if (keybind.modifiers === modifiers && keybind.key === event.key) {
        editor.runCommand(keybind.command)
      }
    })
  })
}
