// The serventia theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in serventia.settings.json and the generated serventia.settings.ts;
// change them with `astryx experimental theme editor set serventia ...`. Add your own changes below: they win over the settings.
//
// ServentIA: cores, raios e tamanho de texto vêm do DESIGN.md (edenprep). As fontes do next/font
// (--font-plex) não passam pelo editor; quem as aplica é src/styles/globals.css.
import {defineTheme} from '@astryxdesign/core/theme';
import {serventiaSettings} from './serventia.settings';

export const serventiaTheme = defineTheme({
  extends: serventiaSettings,
  name: 'serventia',
});
