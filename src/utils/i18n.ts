import { __ as wp__, setLocaleData, sprintf as wpSprintf } from '@wordpress/i18n';

// Local translation data for demo languages
const localeData: Record<string, any> = {
  es: {
    '': {
      domain: 'default',
      lang: 'es',
    },
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
    'Reset Workspace': ['Restablecer Espacio de Trabajo'],
  },
  el: {
    '': {
      domain: 'default',
      lang: 'el',
    },
    'DeltaScribe Studio': ['DeltaScribe Studio'],
    'Subtitle Tracks (%d)': ['Κανάλια Υποτίτλων (%d)'],
    'Select Media File': ['Επιλογή Αρχείου Μέσων'],
    'Add Subtitle File': ['Προσθήκη Αρχείου Υποτίτλων'],
    'Select Subtitle File': ['Επιλογή Αρχείου Υποτίτλων'],
    'Create New Subtitles': ['Δημιουργία Νέων Υποτίτλων'],
    'Active Edit': ['Ενεργή Επεξεργασία'],
    'Reference': ['Αναφορά'],
    'No subtitle files loaded. Drop subtitle files here to add them.': [
      'Δεν έχουν φορτωθεί υπότιτλοι. Σύρετε αρχεία υποτίτλων εδώ για να τα προσθέσετε.',
    ],
    'Export': ['Εξαγωγή'],
    'Submit': ['Υποβολή'],
    'Submitting...': ['Υποβολή...'],
    'Reset Workspace': ['Επαναφορά Χώρου Εργασίας'],
  },
};

// Initialize locale based on browser settings
const userLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

if (localeData[userLang]) {
  setLocaleData(localeData[userLang], 'default');
}

export const __ = wp__;
export const sprintf = wpSprintf;
