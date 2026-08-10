// Plantilla de Configuración General
// Copiá este archivo a "config.js" y completá con tus datos reales.

const APP_CONFIG = {
    // Datos de apoyo y donación
    SUPPORT: {
        CAFECITO_URL: "https://cafecito.app/elaltillo",
        MP_ALIAS: "nvassallo.mp",
        MP_CVU: "0000003100023763085134"
    },

    // Configuración del sitio y SEO
    SITE: {
        NAME: "Calculadora de Comisiones AR",
        AUTHOR: "elaltillo",
        AUTHOR_URL: "https://github.com/NikozV",
        DOMAIN: "https://comision-calc-ar.pages.dev"
    }
};

// Congelar el objeto para evitar modificaciones accidentales en tiempo de ejecución
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.SUPPORT);
Object.freeze(APP_CONFIG.SITE);