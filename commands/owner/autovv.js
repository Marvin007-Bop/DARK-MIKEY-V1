module.exports = {
    name: 'autovv',
    category: 'owner',
    ownerOnly: false,
    execute: async (sock, msg, args, { reply }) => {
        const database = require('../../database');
        
        // On crée un faux groupe "global_settings" pour stocker ce réglage pour tout le bot
        const settings = database.getGroupSettings('global_settings');
        const newState = !settings.autovv;
        
        database.updateGroupSettings('global_settings', { autovv: newState });
        
        const etat = newState ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ';
        reply(`👁️ *Mode Auto-Vue Unique Global* : ${etat}\n\nLe bot interceptera désormais TOUTES les vues uniques (Groupes et Privé), les convertira en médias normaux, et te les enverra ici.`);
    }
};
