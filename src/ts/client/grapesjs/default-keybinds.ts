import { Editor } from 'grapesjs'
import { setKeybind, TriggerScopes } from './keybindsPlugin'
import { cmdOpenSettings } from './settings'
import { cmdPublicationStart } from './PublicationManager'
import { cmdPublish } from './PublicationUi'
import { cmdPromptAddSymbol } from './symbolDialogs'
import { cmdTogglePages } from './page-panel'
import { cmdOpenNewPageDialog } from './new-page-dialog'
import { cmdToggleBlocks, cmdToggleLayers, cmdToggleNotifications, cmdToggleSymbols } from './index'

function runRTEAction(editor: Editor, action: string) {
  const rte = editor.RichTextEditor
  rte.run(rte.get(action))
}

// TODO: Close other (left) panels when opening one
// TODO: Make them close when repeating the same keybinding

export default function (editor: Editor) {
  // General keybindings
  setKeybind(editor, 'shift+r', cmdOpenSettings, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'shift+n', cmdToggleNotifications, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'shift+p', cmdTogglePages, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'shift+l', cmdToggleLayers, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'shift+b', cmdToggleBlocks, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'shift+s', cmdToggleSymbols, TriggerScopes.GLOBAL_NO_TEXT_EDIT)

  // Rich Text keybindings (useful when the web browser overrides the "Ctrl" equivalents)
  setKeybind(editor, 'alt+b', editor => runRTEAction(editor, 'bold'), TriggerScopes.TEXT_EDIT)
  setKeybind(editor, 'alt+u', editor => runRTEAction(editor, 'underline'), TriggerScopes.TEXT_EDIT)
  setKeybind(editor, 'alt+i', editor => runRTEAction(editor, 'italic'), TriggerScopes.TEXT_EDIT)
  setKeybind(editor, 'alt+s', editor => runRTEAction(editor, 'strikethrough'), TriggerScopes.TEXT_EDIT)
  setKeybind(editor, 'alt+l', editor => runRTEAction(editor, 'link'), TriggerScopes.TEXT_EDIT)

  // Specific keybindings
  setKeybind(editor, 'ctrl+alt+shift+p', editor => {
    editor.runCommand(cmdPublish)
    editor.runCommand(cmdPublicationStart)
  }, TriggerScopes.GLOBAL)
  setKeybind(editor, 'ctrl+shift+a', cmdPromptAddSymbol, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
  setKeybind(editor, 'ctrl+shift+n', cmdOpenNewPageDialog, TriggerScopes.GLOBAL_NO_TEXT_EDIT)
}
