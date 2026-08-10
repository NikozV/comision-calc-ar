// Plantilla de Configuración General
// Copiá este archivo a "config.js" y completá con tus datos reales.

const APP_CONFIG = {
    // Datos de apoyo y donación
    SUPPORT: {
        CAFECITO_URL: "https://cafecito.app/TU_USUARIO",
        MP_ALIAS: "tu.alias.mp",
        MP_CVU: "0000000000000000000000"
    },

    // Configuración del sitio y SEO
    SITE: {
        NAME: "Calculadora de Comisiones AR",
        AUTHOR: "elaltillo",
        DOMAIN: "https://comision-calc-ar.vassallo-mn.workers.dev"
    }
};

// Congelar el objeto para evitar modificaciones accidentales en tiempo de ejecución
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.SUPPORT);
Object.freeze(APP_CONFIG.SITE);