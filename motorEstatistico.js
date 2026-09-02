/**
 * MOTOR ESTATÍSTICO DE ALTA PRECISÃO PARA ENGENHARIA DE AVALIAÇÕES (NBR 14653)
 * Versão 100% Autocontida (Sem dependências de bibliotecas externas ou CDNs)
 */

// --- MICRO-MOTOR DE ÁLGEBRA LINEAR NATIVO (Substituindo o math.js) ---
const mathNativo = {
    transpose(matrix) {
        return matrix.map((_, colIndex) => matrix.map(row => row[colIndex]));
    },
    multiply(A, B) {
        if (!Array.isArray(B)) { // Multiplicação de Escalar por Matriz
            const scalar = A;
            const mat = B;
            return mat.map(row => row.map(val => val * scalar));
        }
        // Multiplicação de Matriz por Matriz
        let result = new Array(A.length).fill(0).map(() => new Array(B[0].length).fill(0));
        for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < B[0].length; j++) {
                for (let k = 0; k < A[0].length; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    },
    inv(M) { // Inversão de Matriz por Eliminação de Gauss-Jordan (Alta Precisão)
        let n = M.length;
        let E = new Array(n).fill(0).map((_, i) => new Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        let A = M.map(row => [...row]);

        for (let i = 0; i < n; i++) {
            let pivot = A[i][i];
            if (Math.abs(pivot) < 1e-10) {
                pivot = 1e-10;
                A[i][i] = pivot;
            }
            for (let j = 0; j < n; j++) {
                A[i][j] /= pivot;
                E[i][j] /= pivot;
            }
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    let factor = A[k][i];
                    for (let j = 0; j < n; j++) {
                        A[k][j] -= factor * A[i][j];
                        E[k][j] -= factor * E[i][j];
                    }
                }
            }
        }
        return E;
    },
    subtract(A, B) {
        return A.map((row, i) => row.map((val, j) => val - B[i][j]));
    },
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
};

// --- FUNÇÕES AUXILIARES DE DISTRIBUIÇÃO ESTATÍSTICA (Aproximações Polinomiais) ---
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

// --- PROCESSAMENTO PRINCIPAL DA REGRESSÃO NBR 14653 ---
export function executarProcessamentoEstatistico(amostra, variaveisX, variavelY) {
    const N = amostra.length;
    const K = variaveisX.length;
    const GL = N - K - 1;

    if (GL <= 0) throw new Error("Amostra insuficiente para o número de variáveis.");

    let X = [];
    let Y = [];

    amostra.forEach(imovel => {
        // Inicialização explícita com o número 1 para o Intercepto (b0)
        let linhaX =; 
        
        variaveisX.forEach(v => {
            linhaX.push(Number(imovel[v]));
        });
        X.push(linhaX);
        Y.push([Number(imovel[variavelY])]);
    });

    // Operações Matriciais Nativas
    const XT = mathNativo.transpose(X);
    const XTX = mathNativo.multiply(XT, X);
    const XTX_inv = mathNativo.inv(XTX);
    const XTY = mathNativo.multiply(XT, Y);
    const Beta = mathNativo.multiply(XTX_inv, XTY);

    // Extração linear estável dos coeficientes e dados
    const coeficientesFlats = Beta.map(row => row[0]);
    const Y_predito = mathNativo.multiply(X, Beta);
    const Residuos = mathNativo.subtract(Y, Y_predito).map(row => row[0]);
    const Y_flat = Y.map(row => row[0]);

    const Y_media = mathNativo.mean(Y_flat);
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
    const matrizVarCov = mathNativo.multiply(varianciaResidual, XTX_inv);

    const relatorioVariaveis = [];
    const nomesVariaveis = ['Intercepto', ...variaveisX];

    for (let j = 0; j < coeficientesFlats.length; j++) {
        const erroPadraoCoeficiente = Math.sqrt(matrizVarCov[j][j]);
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
    const F_significativo = F_pValue <= 0.05;

    let grauFundamentacaoRegressao = "Inadmissível";
    if (F_pValue <= 0.01) grauFundamentacaoRegressao = "Grau III";
    else if (F_pValue <= 0.05) grauFundamentacaoRegressao = "Grau II";

    return {
        estatisticasGerais: {
            tamanhoAmostra: N,
            grausLiberdade: GL,
            erroPadraoRegressao: s,
            r2: R2,
            r2Ajustado: R2_ajustado
        },
        testeGlobalF: {
            fCalculado: F_calculado,
            pValue: F_pValue,
            significativo: F_significativo,
            grauResultado: grauFundamentacaoRegressao
        },
        analiseCoeficientes: relatorioVariaveis,
        residuos: Residuos
    };
}

