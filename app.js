/**
 * Calculadora de Comisiones de Cobro para Argentina
 * app.js - Lógica de cálculo, pasarelas de pago, eventos, cotización de dólar en vivo y soporte
 */

// Base de datos de pasarelas de pago y sus opciones
const PAYMENT_GATEWAYS = {
    mercadopago: {
        name: "Mercado Pago",
        icon: "mp",
        badge: "Más usado",
        color: "from-sky-500 to-blue-600",
        currency: "ARS",
        options: [
            { id: "mp_qr_dinero", name: "QR - Dinero en cuenta", rate: 0.80, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_qr_debito", name: "QR - Tarjeta de Débito", rate: 1.50, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_qr_credito", name: "QR - Tarjeta de Crédito", rate: 6.39, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_link_acto", name: "Link / Checkout Web - En el acto", rate: 6.39, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_link_10d", name: "Link / Checkout Web - 10 días", rate: 4.49, fixed: 0, period: "10 días", hasVat: true },
            { id: "mp_link_14d", name: "Link / Checkout Web - 14 días", rate: 3.39, fixed: 0, period: "14 días", hasVat: true },
            { id: "mp_link_35d", name: "Link / Checkout Web - 35 días", rate: 1.49, fixed: 0, period: "35 días", hasVat: true },
            { id: "mp_point_debito", name: "Point - Débito", rate: 3.19, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_point_credito_acto", name: "Point - Crédito En el acto", rate: 6.39, fixed: 0, period: "En el acto", hasVat: true },
            { id: "mp_point_credito_10d", name: "Point - Crédito 10 días", rate: 4.49, fixed: 0, period: "10 días", hasVat: true },
            { id: "mp_point_credito_14d", name: "Point - Crédito 14 días", rate: 3.39, fixed: 0, period: "14 días", hasVat: true },
            { id: "mp_point_credito_60d", name: "Point - Crédito 60 días", rate: 0.00, fixed: 0, period: "60 días", hasVat: true }
        ]
    },
    uala: {
        name: "Ualá Bis",
        icon: "uala",
        badge: "Baja comisión",
        color: "from-red-500 to-rose-600",
        currency: "ARS",
        options: [
            { id: "uala_acto", name: "Cobro Inmediato", rate: 4.40, fixed: 0, period: "En el acto", hasVat: true },
            { id: "uala_14d", name: "Cobro a 14 días", rate: 2.90, fixed: 0, period: "14 días", hasVat: true },
            { id: "uala_qr", name: "QR - Dinero en cuenta", rate: 0.60, fixed: 0, period: "En el acto", hasVat: true }
        ]
    },
    stripe: {
        name: "Stripe",
        icon: "stripe",
        badge: "Internacional (USD)",
        color: "from-indigo-600 to-violet-700",
        currency: "USD",
        options: [
            { id: "stripe_nac", name: "Tarjeta Nacional (USD)", rate: 2.90, fixed: 0.30, isFixedUsd: true, period: "2-7 días", hasVat: false },
            { id: "stripe_int", name: "Tarjeta Internacional (USD)", rate: 3.90, fixed: 0.30, isFixedUsd: true, period: "2-7 días", hasVat: false }
        ]
    },
    payway: {
        name: "Payway / Posnet",
        icon: "payway",
        badge: "Comercios",
        color: "from-emerald-500 to-teal-700",
        currency: "ARS",
        options: [
            { id: "payway_debito", name: "Tarjeta de Débito", rate: 1.50, fixed: 0, period: "24 horas", hasVat: true },
            { id: "payway_credito", name: "Tarjeta de Crédito", rate: 1.80, fixed: 0, period: "48 horas", hasVat: true }
        ]
    },
    lemon: {
        name: "Lemon Cash",
        icon: "lemon",
        badge: "Crypto / ARS",
        color: "from-green-400 to-emerald-600",
        currency: "ARS",
        options: [
            { id: "lemon_qr", name: "QR / Lemon Pay", rate: 0.50, fixed: 0, period: "En el acto", hasVat: true }
        ]
    },
    naranjax: {
        name: "Naranja X",
        icon: "naranjax",
        badge: "Planes locales",
        color: "from-amber-500 to-orange-600",
        currency: "ARS",
        options: [
            { id: "nx_acto", name: "Cobro En el acto", rate: 3.99, fixed: 0, period: "En el acto", hasVat: true },
            { id: "nx_14d", name: "Cobro a 14 días", rate: 1.99, fixed: 0, period: "14 días", hasVat: true }
        ]
    },
    custom: {
        name: "Personalizada",
        icon: "custom",
        badge: "A tu medida",
        color: "from-purple-500 to-indigo-600",
        currency: "ARS",
        options: [
            { id: "custom_rate", name: "Comisión Personalizada", rate: 5.00, fixed: 0, period: "Personalizado", hasVat: true }
        ]
    }
};

// Estado Global de la Calculadora
const state = {
    mode: "receive", // "receive" | "charge"
    gateway: "mercadopago",
    optionId: "mp_link_acto",
    amount: 10000,
    vatPercent: 21,
    taxPercent: 0,
    customRate: 5.00,
    customFixed: 0,
    dolarRates: {
        oficial: { compra: 1050, venta: 1090 },
        mep: { compra: 1280, venta: 1295 },
        cripto: { compra: 1300, venta: 1320 },
        tarjeta: { compra: 1700, venta: 1740 }
    },
    dolarUpdated: false
};

// Formateador de moneda en Pesos Argentinos
const formatARS = (val) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val || 0);
};

// Formateador de moneda en Dólares USD
const formatUSD = (val) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val || 0);
};

// Formateador de porcentaje
const formatPercent = (val) => {
    return new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val || 0) + "%";
};

// Obtener cotizaciones del Dólar en vivo desde dolarapi.com
async function fetchDolarRates() {
    try {
        const res = await fetch("https://dolarapi.com/v1/dolares");
        if (!res.ok) throw new Error("Error en respuesta DolarApi");
        const data = await res.json();

        data.forEach(item => {
            const casa = item.casa;
            if (casa === "oficial") state.dolarRates.oficial = { compra: item.compra, venta: item.venta };
            if (casa === "bolsa") state.dolarRates.mep = { compra: item.compra, venta: item.venta };
            if (casa === "cripto") state.dolarRates.cripto = { compra: item.compra, venta: item.venta };
            if (casa === "tarjeta") state.dolarRates.tarjeta = { compra: item.compra, venta: item.venta };
        });

        state.dolarUpdated = true;
        renderDolarTicker();
        updateUI();
    } catch (err) {
        console.warn("No se pudo cargar la API en vivo de dólares. Usando cotizaciones de respaldo:", err);
        renderDolarTicker();
    }
}

// Renderizar la barra de cotizaciones de Dólar
function renderDolarTicker() {
    const container = document.getElementById("dolar-ticker-container");
    if (!container) return;

    const rates = state.dolarRates;
    const isLive = state.dolarUpdated;

    container.innerHTML = `
        <div class="flex items-center justify-between gap-4 overflow-x-auto py-2 text-xs">
            <div class="flex items-center gap-2 whitespace-nowrap">
                <span class="w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}"></span>
                <span class="font-bold text-slate-300">${isLive ? "Dólar en Vivo (dolarapi.com)" : "Cotización estimada Dólar"}</span>
            </div>
            <div class="flex items-center gap-4 text-slate-300 font-medium">
                <div class="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span class="text-slate-400">Oficial:</span>
                    <span class="font-bold text-white">$${rates.oficial.venta}</span>
                </div>
                <div class="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span class="text-slate-400">MEP:</span>
                    <span class="font-bold text-sky-400">$${rates.mep.venta}</span>
                </div>
                <div class="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span class="text-slate-400">Cripto:</span>
                    <span class="font-bold text-emerald-400">$${rates.cripto.venta}</span>
                </div>
                <div class="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span class="text-slate-400">Tarjeta:</span>
                    <span class="font-bold text-amber-400">$${rates.tarjeta.venta}</span>
                </div>
            </div>
        </div>
    `;
}

// Obtener datos de la opción seleccionada actualmente
function getSelectedOptionData() {
    const gw = PAYMENT_GATEWAYS[state.gateway];
    if (!gw) return null;

    if (state.gateway === "custom") {
        return {
            id: "custom_rate",
            name: "Comisión Personalizada",
            rate: parseFloat(state.customRate) || 0,
            fixed: parseFloat(state.customFixed) || 0,
            period: "A convenir",
            hasVat: state.vatPercent > 0,
            isUsd: false
        };
    }

    const opt = gw.options.find(o => o.id === state.optionId);
    return { ...opt, isUsd: gw.currency === "USD" };
}

// Ejecutar el cálculo matemático
function calculateFees() {
    const option = getSelectedOptionData();
    if (!option) return null;

    const rawAmount = Math.max(0, parseFloat(state.amount) || 0);
    const commRate = option.rate / 100;
    const vatRate = (option.hasVat ? (parseFloat(state.vatPercent) || 0) : 0) / 100;
    const taxRate = (parseFloat(state.taxPercent) || 0) / 100;
    const fixedCost = option.fixed || 0;
    const isUsd = option.isUsd;

    let gross = 0;
    let net = 0;
    let baseCommission = 0;
    let vatAmount = 0;
    let taxAmount = 0;
    let totalDeduction = 0;

    if (state.mode === "receive") {
        // MODO 1: Ingresa Monto Bruto, calcular Neto a recibir
        gross = rawAmount;
        baseCommission = gross * commRate;
        vatAmount = baseCommission * vatRate;
        taxAmount = gross * taxRate;
        totalDeduction = baseCommission + vatAmount + taxAmount + fixedCost;
        net = Math.max(0, gross - totalDeduction);
    } else {
        // MODO 2: Ingresa Neto deseado, calcular Bruto necesario a cobrar
        net = rawAmount;
        const effectiveRate = (commRate * (1 + vatRate)) + taxRate;
        
        if (effectiveRate >= 1) {
            gross = net;
        } else {
            gross = (net + fixedCost) / (1 - effectiveRate);
        }

        baseCommission = gross * commRate;
        vatAmount = baseCommission * vatRate;
        taxAmount = gross * taxRate;
        totalDeduction = gross - net;
    }

    const effectivePercent = gross > 0 ? (totalDeduction / gross) * 100 : 0;

    // Cálculo equivalente en ARS si la transacción es en USD (vía Dólar MEP)
    const mepRate = state.dolarRates.mep.venta || 1300;
    const netArsEquivalent = isUsd ? net * mepRate : null;
    const grossArsEquivalent = isUsd ? gross * mepRate : null;

    return {
        mode: state.mode,
        gross,
        net,
        baseCommission,
        vatAmount,
        taxAmount,
        fixedCost,
        totalDeduction,
        effectivePercent,
        period: option.period,
        optionName: option.name,
        gatewayName: PAYMENT_GATEWAYS[state.gateway].name,
        isUsd,
        mepRate,
        netArsEquivalent,
        grossArsEquivalent
    };
}

// Renderizar / Actualizar la UI
function updateUI() {
    const results = calculateFees();
    if (!results) return;

    const elGross = document.getElementById("res-gross");
    const elNet = document.getElementById("res-net");
    const elCommission = document.getElementById("res-commission");
    const elVat = document.getElementById("res-vat");
    const elTax = document.getElementById("res-tax");
    const elFixed = document.getElementById("res-fixed");
    const elTotalDeduction = document.getElementById("res-total-deduction");
    const elEffectivePercent = document.getElementById("res-effective-percent");
    const elPeriod = document.getElementById("res-period");
    const elUsdConversion = document.getElementById("res-usd-conversion");

    const formatFn = results.isUsd ? formatUSD : formatARS;

    if (elGross) elGross.textContent = formatFn(results.gross);
    if (elNet) elNet.textContent = formatFn(results.net);
    if (elCommission) elCommission.textContent = formatFn(results.baseCommission);
    if (elVat) elVat.textContent = formatFn(results.vatAmount);
    if (elTax) elTax.textContent = formatFn(results.taxAmount);
    if (elFixed) elFixed.textContent = formatFn(results.fixedCost);
    if (elTotalDeduction) elTotalDeduction.textContent = `- ${formatFn(results.totalDeduction)}`;
    if (elEffectivePercent) elEffectivePercent.textContent = `(${formatPercent(results.effectivePercent)} del total)`;
    if (elPeriod) elPeriod.textContent = results.period;

    // Mostrar u ocultar la tarjeta de conversión de USD a ARS
    if (elUsdConversion) {
        if (results.isUsd) {
            elUsdConversion.classList.remove("hidden");
            elUsdConversion.innerHTML = `
                <div class="bg-sky-950/40 border border-sky-800/50 rounded-2xl p-3 text-center space-y-1 mt-3">
                    <span class="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Equivalente Neto en Pesos (Dólar MEP $${results.mepRate})</span>
                    <div class="text-xl font-bold text-sky-300">${formatARS(results.netArsEquivalent)}</div>
                </div>
            `;
        } else {
            elUsdConversion.classList.add("hidden");
        }
    }

    // Etiqueta del input principal
    const amountLabel = document.getElementById("amount-input-label");
    const amountSubtext = document.getElementById("amount-input-subtext");
    const currencyBadge = document.getElementById("currency-badge");

    if (currencyBadge) {
        currencyBadge.textContent = results.isUsd ? "USD ($)" : "ARS ($)";
    }

    if (amountLabel) {
        const symbol = results.isUsd ? "USD ($)" : "ARS ($)";
        if (state.mode === "receive") {
            amountLabel.textContent = `Monto Bruto a cobrar (${symbol})`;
            if (amountSubtext) amountSubtext.textContent = "Ingresá lo que vas a cobrar al cliente para saber cuánto te queda limpio.";
        } else {
            amountLabel.textContent = `Monto Neto deseado en tu bolsillo (${symbol})`;
            if (amountSubtext) amountSubtext.textContent = "Ingresá cuánto querés recibir limpio para saber cuánto cobrar al cliente.";
        }
    }

    // Mostrar/Ocultar controles personalizados
    const customPanel = document.getElementById("custom-gateway-panel");
    if (customPanel) {
        if (state.gateway === "custom") {
            customPanel.classList.remove("hidden");
        } else {
            customPanel.classList.add("hidden");
        }
    }
}

// Renderizar la lista de Pasarelas
function renderGatewayTabs() {
    const container = document.getElementById("gateway-tabs-container");
    if (!container) return;

    container.innerHTML = "";
    Object.keys(PAYMENT_GATEWAYS).forEach(key => {
        const gw = PAYMENT_GATEWAYS[key];
        const isActive = state.gateway === key;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
            isActive
                ? "bg-slate-800 text-white border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500"
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
        }`;
        btn.onclick = () => selectGateway(key);

        btn.innerHTML = `
            <span class="w-3 h-3 rounded-full bg-gradient-to-r ${gw.color}"></span>
            <span>${gw.name}</span>
            ${gw.badge ? `<span class="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">${gw.badge}</span>` : ""}
        `;

        container.appendChild(btn);
    });
}

// Renderizar las opciones específicas de la pasarela seleccionada
function renderOptionsSelect() {
    const container = document.getElementById("gateway-options-container");
    if (!container) return;

    const gw = PAYMENT_GATEWAYS[state.gateway];
    if (!gw || state.gateway === "custom") {
        container.innerHTML = "";
        return;
    }

    let html = `
        <label for="gateway-option-select" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Modalidad de cobro / Plazo
        </label>
        <select id="gateway-option-select" class="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium text-sm">
    `;

    gw.options.forEach(opt => {
        const selected = state.optionId === opt.id ? "selected" : "";
        const vatNote = opt.hasVat ? "+ IVA" : "final";
        const fixedStr = opt.fixed > 0 ? ` + $${opt.fixed} ${gw.currency}` : "";
        html += `<option value="${opt.id}" ${selected}>${opt.name} (${opt.rate}%${fixedStr} ${vatNote} - ${opt.period})</option>`;
    });

    html += `</select>`;
    container.innerHTML = html;

    const selectEl = document.getElementById("gateway-option-select");
    if (selectEl) {
        selectEl.onchange = (e) => {
            state.optionId = e.target.value;
            updateUI();
        };
    }
}

// Cambiar de pasarela de pago activa
function selectGateway(key) {
    state.gateway = key;
    const gw = PAYMENT_GATEWAYS[key];
    if (gw && gw.options && gw.options.length > 0) {
        state.optionId = gw.options[0].id;
    }
    // Si cambia a Stripe, ajustar monto por omisión a USD 100 si es 10000
    if (key === "stripe" && state.amount === 10000) {
        state.amount = 100;
        const amountInput = document.getElementById("amount-input");
        if (amountInput) amountInput.value = 100;
    } else if (key !== "stripe" && state.amount === 100) {
        state.amount = 10000;
        const amountInput = document.getElementById("amount-input");
        if (amountInput) amountInput.value = 10000;
    }

    renderGatewayTabs();
    renderOptionsSelect();
    updateUI();
}

// Cambiar modo de cálculo
function setMode(newMode) {
    state.mode = newMode;
    const tabReceive = document.getElementById("tab-mode-receive");
    const tabCharge = document.getElementById("tab-mode-charge");

    if (newMode === "receive") {
        tabReceive.className = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 bg-sky-500 text-white shadow-md shadow-sky-500/20";
        tabCharge.className = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50";
    } else {
        tabCharge.className = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 bg-sky-500 text-white shadow-md shadow-sky-500/20";
        tabReceive.className = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50";
    }

    updateUI();
}

// Copiar desglose al portapapeles
function copyBreakdown() {
    const results = calculateFees();
    if (!results) return;

    const formatFn = results.isUsd ? formatUSD : formatARS;

    const text = `📊 *Desglose de Cobro (${results.gatewayName})*
    
🔹 *Opción:* ${results.optionName}
🔹 *Monto Bruto (Cobrado):* ${formatFn(results.gross)}
🔻 *Comisión Base:* ${formatFn(results.baseCommission)}
${results.vatAmount > 0 ? `🔻 *IVA (21%):* ${formatFn(results.vatAmount)}\n` : ""}${results.taxAmount > 0 ? `🔻 *Retenciones:* ${formatFn(results.taxAmount)}\n` : ""}${results.fixedCost > 0 ? `🔻 *Costo Fijo:* ${formatFn(results.fixedCost)}\n` : ""}🔻 *Total Descuentos:* ${formatFn(results.totalDeduction)} (${formatPercent(results.effectivePercent)})
=========================
💵 *Monto Neto a Recibir:* ${formatFn(results.net)}${results.isUsd ? ` (~ ${formatARS(results.netArsEquivalent)} al Dólar MEP)` : ""}
⏱️ *Acreditación:* ${results.period}

Calculado con Calculadora de Comisiones AR (${APP_CONFIG?.SITE?.DOMAIN || "https://comision-calc-ar.pages.dev"})`;

    navigator.clipboard.writeText(text).then(() => {
        showToast("¡Desglose copiado al portapapeles! 📋");
    }).catch(() => {
        showToast("No se pudo copiar el texto.");
    });
}

// Mostrar Toast Notificación
function showToast(msg) {
    const toast = document.getElementById("toast-notification");
    const toastMsg = document.getElementById("toast-message");

    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.remove("translate-y-20", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-20", "opacity-0");
    }, 3000);
}

// Inicializar el bloque de soporte desde APP_CONFIG
function initSupportBlock() {
    const config = typeof APP_CONFIG !== "undefined" ? APP_CONFIG.SUPPORT : null;
    if (!config) return;

    const cafecitoBtn = document.getElementById("cafecito-btn");
    const aliasText = document.getElementById("support-alias-text");
    const cvuText = document.getElementById("support-cvu-text");

    if (cafecitoBtn && config.CAFECITO_URL) {
        cafecitoBtn.href = config.CAFECITO_URL;
    }

    if (aliasText && config.MP_ALIAS) {
        aliasText.textContent = config.MP_ALIAS;
    }

    if (cvuText && config.MP_CVU) {
        cvuText.textContent = config.MP_CVU;
    }
}

// Copiar Alias o CVU
function copySupportDetail(type) {
    const config = typeof APP_CONFIG !== "undefined" ? APP_CONFIG.SUPPORT : null;
    if (!config) return;

    const val = type === "alias" ? config.MP_ALIAS : config.MP_CVU;
    if (!val) return;

    navigator.clipboard.writeText(val).then(() => {
        showToast(`¡${type.toUpperCase()} (${val}) copiado! Muchas gracias ❤️`);
    });
}

// Escuchadores de eventos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    // Input principal de monto
    const amountInput = document.getElementById("amount-input");
    if (amountInput) {
        amountInput.value = state.amount;
        amountInput.addEventListener("input", (e) => {
            state.amount = e.target.value;
            updateUI();
        });
    }

    // Chips de montos rápidos
    const chips = document.querySelectorAll(".amount-chip");
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const val = chip.getAttribute("data-amount");
            if (val && amountInput) {
                state.amount = val;
                amountInput.value = val;
                updateUI();
            }
        });
    });

    // Selects de Impuestos
    const vatSelect = document.getElementById("vat-select");
    if (vatSelect) {
        vatSelect.addEventListener("change", (e) => {
            state.vatPercent = parseFloat(e.target.value) || 0;
            updateUI();
        });
    }

    const taxSelect = document.getElementById("tax-select");
    if (taxSelect) {
        taxSelect.addEventListener("change", (e) => {
            state.taxPercent = parseFloat(e.target.value) || 0;
            updateUI();
        });
    }

    // Custom inputs
    const customRateInput = document.getElementById("custom-rate-input");
    if (customRateInput) {
        customRateInput.addEventListener("input", (e) => {
            state.customRate = e.target.value;
            updateUI();
        });
    }

    const customFixedInput = document.getElementById("custom-fixed-input");
    if (customFixedInput) {
        customFixedInput.addEventListener("input", (e) => {
            state.customFixed = e.target.value;
            updateUI();
        });
    }

    // Renderizar componentes dinámicos y pedir cotizaciones en vivo
    renderGatewayTabs();
    renderOptionsSelect();
    initSupportBlock();
    fetchDolarRates();
    updateUI();
});
