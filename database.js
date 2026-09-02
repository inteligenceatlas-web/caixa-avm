import { openDB } from 'idb';

const NOME_BANCO = 'caixa-avm-pwa';
const VERSAO = 1;

export async function inicializarBanco() {
    return openDB(NOME_BANCO, VERSAO, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('projetos')) {
                db.createObjectStore('projetos', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('amostras')) {
                const amostraStore = db.createObjectStore('amostras', { keyPath: 'id', autoIncrement: true });
                amostraStore.createIndex('projetoId', 'projetoId', { unique: false });
            }
        },
    });
}

export async function salvarAmostraOffline(amostra) {
    const db = await inicializarBanco();
    return db.put('amostras', {
        ...amostra,
        sincronizado: 0,
        dataCriacao: new Date().toISOString()
    });
}