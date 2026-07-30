import { __ as wp__, setLocaleData, sprintf as wpSprintf } from '@wordpress/i18n';

// Translation dictionaries for internet languages > 2% usage share
const localeData: Record<string, any> = {
  es: { // Spanish
    '': { domain: 'default', lang: 'es' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Pistas de Subtítulos (%d)'],
    'Select Media File': ['Seleccionar Archivo de Medios'],
    'Add Subtitle File': ['Añadir Archivo de Subtítulos'],
    'Select Subtitle File': ['Seleccionar Archivo de Subtítulos'],
    'Create New Subtitles': ['Crear Nuevos Subtítulos'],
    'Active Edit': ['Edición Activa'],
    'Reference': ['Referencia'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'No hay archivos de subtítulos cargados. Arrastre archivos de subtítulos aquí para añadirlos.',
    ],
    'Export': ['Exportar'],
    'Submit': ['Enviar'],
    'Submitting...': ['Enviando...'],
    'Reset Workspace': ['Restablecer Espacio de Trabalho'],
  },
  de: { // German
    '': { domain: 'default', lang: 'de' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Untertitelspuren (%d)'],
    'Select Media File': ['Mediendatei auswählen'],
    'Add Subtitle File': ['Untertiteldatei hinzufügen'],
    'Select Subtitle File': ['Untertiteldatei auswählen'],
    'Create New Subtitles': ['Neue Untertitel erstellen'],
    'Active Edit': ['Aktive Bearbeitung'],
    'Reference': ['Referenz'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Keine Untertiteldateien geladen. Ziehen Sie Untertiteldateien hierher, um sie hinzuzufügen.',
    ],
    'Export': ['Exportieren'],
    'Submit': ['Absenden'],
    'Submitting...': ['Wird abgesendet...'],
    'Reset Workspace': ['Arbeitsbereich zurücksetzen'],
  },
  ja: { // Japanese
    '': { domain: 'default', lang: 'ja' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['字幕トラック (%d)'],
    'Select Media File': ['メディアファイルを選択'],
    'Add Subtitle File': ['字幕ファイルを追加'],
    'Select Subtitle File': ['字幕ファイルを選択'],
    'Create New Subtitles': ['新しい字幕を作成'],
    'Active Edit': ['現在編集中のトラック'],
    'Reference': ['参照用'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      '字幕ファイルが読み込まれていません。ここに字幕ファイルをドラッグして追加します。',
    ],
    'Export': ['エクスポート'],
    'Submit': ['送信'],
    'Submitting...': ['送信中...'],
    'Reset Workspace': ['ワークスペースをリセット'],
  },
  fr: { // French
    '': { domain: 'default', lang: 'fr' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Pistes de sous-titres (%d)'],
    'Select Media File': ['Sélectionner un fichier média'],
    'Add Subtitle File': ['Ajouter un fichier de sous-titres'],
    'Select Subtitle File': ['Sélectionner un fichier de sous-titres'],
    'Create New Subtitles': ['Créer de nouveaux sous-titres'],
    'Active Edit': ['Modification active'],
    'Reference': ['Référence'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Aucun fichier de sous-titres chargé. Déposez des fichiers de sous-titres ici pour les ajouter.',
    ],
    'Export': ['Exporter'],
    'Submit': ['Soumettre'],
    'Submitting...': ['Soumission en cours...'],
    'Reset Workspace': ['Réinitialiser l\'espace de travail'],
  },
  pt: { // Portuguese
    '': { domain: 'default', lang: 'pt' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Faixas de legendas (%d)'],
    'Select Media File': ['Selecionar arquivo de mídia'],
    'Add Subtitle File': ['Adicionar arquivo de legenda'],
    'Select Subtitle File': ['Selecionar arquivo de legenda'],
    'Create New Subtitles': ['Criar novas legendas'],
    'Active Edit': ['Edição ativa'],
    'Reference': ['Referência'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Nenhum arquivo de legenda carregado. Arraste arquivos de legenda aqui para adicioná-los.',
    ],
    'Export': ['Exportar'],
    'Submit': ['Enviar'],
    'Submitting...': ['Enviando...'],
    'Reset Workspace': ['Redefinir espaço de trabalho'],
  },
  ru: { // Russian
    '': { domain: 'default', lang: 'ru' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Дорожки субтитров (%d)'],
    'Select Media File': ['Выбрать медиафайл'],
    'Add Subtitle File': ['Добавить файл субтитров'],
    'Select Subtitle File': ['Выбрать файл субтитров'],
    'Create New Subtitles': ['Создать новые субтитры'],
    'Active Edit': ['Активное редактирование'],
    'Reference': ['Ссылка/Сравнение'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Файлы субтитров не загружены. Перетащите файлы субтитров сюда, чтобы добавить их.',
    ],
    'Export': ['Экспорт'],
    'Submit': ['Отправить'],
    'Submitting...': ['Отправка...'],
    'Reset Workspace': ['Сбросить рабочую область'],
  },
  it: { // Italian
    '': { domain: 'default', lang: 'it' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Tracce dei sottotitoli (%d)'],
    'Select Media File': ['Seleziona file multimediale'],
    'Add Subtitle File': ['Aggiungi file dei sottotitoli'],
    'Select Subtitle File': ['Seleziona file dei sottotitoli'],
    'Create New Subtitles': ['Crea nuovi sottotitoli'],
    'Active Edit': ['Modifica attiva'],
    'Reference': ['Riferimento'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Nessun file di sottotitoli caricato. Trascina i file dei sottotitoli qui per aggiungerli.',
    ],
    'Export': ['Esporta'],
    'Submit': ['Invia'],
    'Submitting...': ['Invio in corso...'],
    'Reset Workspace': ['Ripristina spazio di lavoro'],
  },
  nl: { // Dutch
    '': { domain: 'default', lang: 'nl' },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Ondertitelsporen (%d)'],
    'Select Media File': ['Mediabestand selecteren'],
    'Add Subtitle File': ['Ondertitelbestand toevoegen'],
    'Select Subtitle File': ['Ondertitelbestand selecteren'],
    'Create New Subtitles': ['Nieuwe ondertiteling maken'],
    'Active Edit': ['Actieve bewerking'],
    'Reference': ['Referentie'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Geen ondertitelbestanden geladen. Sleep ondertitelbestanden hierheen om ze toe te voegen.',
    ],
    'Export': ['Exporteren'],
    'Submit': ['Verzenden'],
    'Submitting...': ['Verzenden...'],
    'Reset Workspace': ['Werkruimte resetten'],
  },
};

// Initialize locale based on browser settings
const userLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

if (localeData[userLang]) {
  setLocaleData(localeData[userLang], 'default');
}

export const __ = wp__;
export const sprintf = wpSprintf;
