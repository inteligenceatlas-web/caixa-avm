// Removemos o import antigo e usamos o math global injetado pelo index.html
const math = window.math;


function cdfNormal(x) {
    const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
    const p = 0.2316419, c = 0.39894228;
    if (x >= 0) {
        let t = 1.0 / (1.0 + p * x);
        return 1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    } else {
        let t = 1.0 / (1.0 - p * x);
        return c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    }
}

function pValueStudentT(t, df) {
    t = Math.abs(t);
    if (df <= 0) return 1.0;
    if (df > 100) return 2.0 * (1.0 - cdfNormal(t));
    let x = t;
    let z = x * (1.0 - 1.0 / (4.0 * df)) / Math.sqrt(1.0 + x * x / (2.0 * df));
    return Math.max(0, Math.min(1, 2.0 * (1.0 - cdfNormal(Math.abs(z)))));
}

function pValueFDist(F, df1, df2) {
    if (F <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
    let a = 2.0 / (9.0 * df1);
    let b = 2.0 / (9.0 * df2);
    let num = Math.pow(1.0 - b, 2.0 / 3.0) - (1.0 - a) * Math.pow(F, 1.0 / 3.0);
    let den = Math.sqrt(b * Math.pow(1.0 - b, 1.0 / 3.0) + a * Math.pow(F, 2.0 / 3.0) * Math.pow(1.0 - b, 1.0 / 3.0));
    return Math.max(0, Math.min(1, 1.0 - cdfNormal(num / den)));
}

export function executarProcessamentoEstatistico(amostra, variaveisX, variavelY, aplicarLogY = false, variaveisLogX = []) {
    const N = amostra.length;
    const K = variaveisX.length;
    const GL = N - K - 1;

    if (GL <= 0) throw new Error('Amostra insuficiente.');

    let X = [];
    let Y = [];

    amostra.forEach(imovel => {
        let linhaX = [1];
        variaveisX.forEach(v => {
            let val = Number(imovel[v]);
            if (variaveisLogX.includes(v)) {
                if (val <= 0) throw new Error(`Valor inválido (<= 0) para logaritmo na variável ${v}`);
                val = Math.log(val);
            }
            linhaX.push(val);
        });
        X.push(linhaX);

        let valY = Number(imovel[variavelY]);
        if (aplicarLogY) {
            if (valY <= 0) throw new Error(`Valor inválido (<= 0) para logaritmo na variável dependente.`);
            valY = Math.log(valY);
        }
        Y.push([valY]);
    });

    const XT = math.transpose(X);
    const XTX = math.multiply(XT, X);
    const XTX_inv = math.inv(XTX);
    const XTY = math.multiply(XT, Y);
    const Beta = math.multiply(XTX_inv, XTY);
    const coeficientesFlats = Beta.flat();

    const Y_predito = math.multiply(X, Beta);
    const Residuos = math.subtract(Y, Y_predito).flat();
    const Y_flat = Y.flat();

    const Y_media = math.mean(Y_flat);
    let SQE = 0, SQT = 0;
    for (let i = 0; i < N; i++) {
        SQE += Math.pow(Residuos[i], 2);
        SQT += Math.pow(Y_flat[i] - Y_media, 2);
    }
    const SQR = SQT - SQE;
    const varianciaResidual = SQE / GL;
    const s = Math.sqrt(varianciaResidual);

    const R2 = 1 - (SQE / SQT);
    const R2_ajustado = 1 - ((1 - R2) * (N - 1) / GL);

    const matrizVarCov = math.multiply(varianciaResidual, XTX_inv);
    const relatorioVariaveis = [];
    const nomesVariaveis = ['Intercepto', ...variaveisX];

    for (let j = 0; j < coeficientesFlats.length; j++) {
        const erroPadraoCoeficiente = Math.sqrt(matrizVarCov.get([j, j]));
        const tCalculado = coeficientesFlats[j] / erroPadraoCoeficiente;
        const pValue = pValueStudentT(tCalculado, GL);
        relatorioVariaveis.push({
            variavel: nomesVariaveis[j],
            coeficiente: coeficientesFlats[j],
            erroPadrao: erroPadraoCoeficiente,
            tCalculado: tCalculado,
            pValue: pValue,
            significativo: pValue <= 0.10
        });
    }

    const F_calculado = (SQR / K) / (SQE / GL);
    const F_pValue = pValueFDist(F_calculado, K, GL);

    return {
        estatisticasGerais: { tamanhoAmostra: N, grausLiberdade: GL, erroPadraoRegressao: s, r2: R2, r2Ajustado: R2_ajustado },
        testeGlobalF: { fCalculado: F_calculado, pValue: F_pValue, significativo: F_pValue <= 0.05, grauResultado: F_pValue <= 0.01 ? "Grau III" : (F_pValue <= 0.05 ? "Grau II" : "Inadmissível") },
        analiseCoeficientes: relatorioVariaveis,
        residuos: Residuos
    };
}
