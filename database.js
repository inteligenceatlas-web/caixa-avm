// Gerenciador de Banco de Dados Local Nativo (Sem dependências externas)
const NOME_BANCO = 'caixa-avm-pwa';
const VERSAO = 1;

export function inicializarBanco() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(NOME_BANCO, VERSAO);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('projetos')) {
                db.createObjectStore('projetos', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('amostras')) {
                const amostraStore = db.createObjectStore('amostras', { keyPath: 'id', autoIncrement: true });
                amostraStore.createIndex('projetoId', 'projetoId', { unique: false });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function salvarAmostraOffline(amostra) {
    return inicializarBanco().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['amostras'], 'readwrite');
            const store = transaction.objectStore('amostras');
            
            const registro = {
                ...amostra,
                sincronizado: 0,
                dataCriacao: new Date().toISOString()
            };

            const request = store.put(registro);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}
