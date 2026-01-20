
export const storage = {
  get: <T,>(key: string, userId: string, defaultValue: T): T => {
    try {
      const storageKey = `finanly_${userId}_${key}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed ?? defaultValue;
      }
      return defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  set: <T,>(key: string, userId: string, value: T): void => {
    try {
      const storageKey = `finanly_${userId}_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage] Erro ao salvar ${key}:`, e);
    }
  },
  getUsers: () => {
    try {
      const users = localStorage.getItem('finanly_users');
      if (!users) return [];
      const parsed = JSON.parse(users);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },
  setUsers: (users: any[]) => {
    localStorage.setItem('finanly_users', JSON.stringify(users));
  },
  importBackup: (jsonData: any): { success: boolean, message: string } => {
    try {
      if (!jsonData || typeof jsonData !== 'object') {
        return { success: false, message: "Arquivo inválido ou corrompido." };
      }

      console.log("[Storage] Analisando backup...", jsonData);
      
      let usersToRestore: any[] = [];
      let fullStoreToRestore: Record<string, string> = {};

      // 1. Tenta encontrar a estrutura de "Full Store" (Backup Total)
      if (jsonData.full_store) {
        fullStoreToRestore = jsonData.full_store;
        const usersJson = fullStoreToRestore['finanly_users'];
        if (usersJson) {
          try {
            usersToRestore = JSON.parse(usersJson);
          } catch(e) {}
        }
      } 
      // 2. Tenta encontrar estrutura de versões anteriores ou parciais
      else if (Array.isArray(jsonData)) {
        usersToRestore = jsonData;
      }
      else if (jsonData.users && Array.isArray(jsonData.users)) {
        usersToRestore = jsonData.users;
      }

      // Validação: Se não achamos usuários, avisamos o usuário
      if (!usersToRestore || usersToRestore.length === 0) {
        return { success: false, message: "Este backup não contém contas de usuário." };
      }

      // Restauração Cirúrgica: Não usa localStorage.clear() para evitar perder o tema ou estados globais
      // Apenas sobrescrevemos o que veio no backup
      Object.keys(fullStoreToRestore).forEach(key => {
        if (key !== 'finanly_auth') { // Não sobrescreve a sessão logada atual se houver uma
          localStorage.setItem(key, fullStoreToRestore[key]);
        }
      });

      // Garante que a chave de usuários está correta
      localStorage.setItem('finanly_users', JSON.stringify(usersToRestore));
      
      return { 
        success: true, 
        message: `Sucesso! Foram restauradas ${usersToRestore.length} conta(s).` 
      };
    } catch (error) {
      console.error("[Storage] Falha crítica na restauração:", error);
      return { success: false, message: "Erro técnico ao processar o arquivo." };
    }
  }
};
