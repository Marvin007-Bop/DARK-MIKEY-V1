module.exports = {
    name: 'autovv',
    category: 'owner',
    ownerOnly: true,
    execute: async (sock, msg, args, { from, reply }) => {
        const database = require('../../database');
        const settings = database.getGroupSettings(from);
        
        // Inverse le statut actuel
        const newState = !settings.autovv;
        database.updateGroupSettings(from, { autovv: newState });
        
        const etat = newState ? '🟢 ACTIVÉE' : '🔴 DÉSACTIVÉE';
        reply(`👁️ *Mode Auto-Vue Unique* : ${etat}\nToutes les vues uniques (Photos, Vidéos, Vocaux) de ce chat seront envoyées en privé au propriétaire.`);
    }
};
